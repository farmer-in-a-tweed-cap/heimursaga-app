// One-shot: bring already-posted entries up to date with the current
// archive.json. PUTs entryType='historical' AND the latest body content
// (e.g. after stripping Gutenberg underscore-italics markers).
//
// Matches state.entries[] back to archive.json by (expeditionId, entryTitle).
//
// Usage:
//   DRY_RUN=true node update-entries.js   # preview
//   node update-entries.js                # live

const fs = require('fs');
const cfg = require('./config');
const state = require('./state');
const { ApiClient, sleep } = require('./api');

function loadArchive() {
  return JSON.parse(fs.readFileSync(cfg.ARCHIVE_FILE, 'utf-8'));
}

// Build (expeditionStateTitle → archive expedition object) using the
// state's expedition title back to the archive title. State titles may be
// prefixed (rename.js) or raw — match by either form against the archive.
function buildExpeditionLookup(archive, state) {
  const byStateTitle = new Map();
  for (const stateExp of state.expeditions || []) {
    for (const item of archive.expeditions || []) {
      const exp = item.expedition;
      if (
        stateExp.title === exp.title ||
        stateExp.title === `${exp.explorer} - ${exp.title}`
      ) {
        byStateTitle.set(stateExp.expeditionId, item);
        break;
      }
    }
  }
  return byStateTitle;
}

function findEntryInArchive(item, entryTitle) {
  return (item?.entries || []).find((e) => e.title === entryTitle);
}

async function run() {
  const archive = loadArchive();
  const seedState = state.load();
  const entries = seedState.entries || [];

  if (entries.length === 0) {
    console.log('No entries in seed-state.json. Nothing to update.');
    return;
  }

  const expByStateId = buildExpeditionLookup(archive, seedState);

  // Build update plan
  const plan = [];
  const skipped = [];
  for (const e of entries) {
    const archiveExp = expByStateId.get(e.expeditionId);
    if (!archiveExp) {
      skipped.push({ ...e, reason: `no archive expedition for ${e.expeditionId}` });
      continue;
    }
    const archiveEntry = findEntryInArchive(archiveExp, e.entryTitle);
    if (!archiveEntry) {
      skipped.push({ ...e, reason: `no archive entry "${e.entryTitle}"` });
      continue;
    }
    if (!archiveEntry.body || archiveEntry.body.includes('PLACEHOLDER')) {
      skipped.push({ ...e, reason: 'archive body is empty or PLACEHOLDER' });
      continue;
    }
    plan.push({
      entryId: e.entryId,
      entryTitle: e.entryTitle,
      content: archiveEntry.body.trim(),
      // Title currently stored with explorer prefix; preserve by sending
      // the same prefix the seeder used.
      title: `${archiveExp.expedition.explorer} - ${e.entryTitle}`,
      entryType: 'historical',
      editorialIntro: archiveEntry.editorialIntro || undefined,
    });
  }

  console.log('=== UPDATE PLAN ===');
  for (const p of plan) {
    console.log(
      `  ${p.entryId}  "${p.entryTitle}"  → entryType=historical, content=${p.content.length} chars`,
    );
  }
  if (skipped.length) {
    console.log('\nSkipped:');
    for (const s of skipped) console.log(`  ${s.entryId} "${s.entryTitle}" — ${s.reason}`);
  }
  console.log(`\nTotal: ${plan.length} updates, ${skipped.length} skipped\n`);

  if (cfg.DRY_RUN) {
    console.log('DRY_RUN=true — no API calls.');
    return;
  }
  if (plan.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  cfg.requireAuthEnv();

  const api = new ApiClient();
  console.log(`[update] base URL: ${api.baseUrl}`);
  await api.login(cfg.ACCOUNT_EMAIL, cfg.ACCOUNT_PASSWORD);
  console.log('[update] login OK\n');

  let success = 0;
  let errors = 0;

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const tag = `[${i + 1}/${plan.length}] "${p.entryTitle}"`;
    try {
      await api._ensureFreshToken();
      const updateBody = {
        title: p.title,
        content: p.content,
        entryType: p.entryType,
      };
      if (p.editorialIntro) {
        updateBody.metadata = { editorialIntro: p.editorialIntro };
      }
      await api._fetch('PUT', `/posts/${p.entryId}`, { body: updateBody });
      success++;
      console.log(`${tag} ✓`);
    } catch (err) {
      errors++;
      console.error(`${tag} ✗ FAILED: ${err.message}`);
      if (err.body) console.error(`  body: ${JSON.stringify(err.body).slice(0, 300)}`);
    }
    if (i < plan.length - 1) await sleep(cfg.RATE_LIMIT_MS);
  }

  console.log('');
  console.log('=== UPDATE COMPLETE ===');
  console.log(`Updated: ${success}`);
  console.log(`Errors:  ${errors}`);
}

run().catch((e) => {
  console.error('[update] FATAL:', e.message);
  process.exit(1);
});
