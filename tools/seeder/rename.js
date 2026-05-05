// One-shot: rename existing expeditions to add the "<Explorer> - " prefix.
// Reads seed-state.json for expeditionIds, looks each up in archive.json
// to find the explorer name, then PUTs the new title.
//
// Usage:
//   DRY_RUN=true node rename.js   # preview only
//   node rename.js                # live update

const fs = require('fs');
const cfg = require('./config');
const state = require('./state');
const { ApiClient, sleep } = require('./api');
const { formatTitle } = require('./transform');

function loadArchive() {
  return JSON.parse(fs.readFileSync(cfg.ARCHIVE_FILE, 'utf-8'));
}

async function run() {
  const archive = loadArchive();
  const seedState = state.load();

  if (!seedState.expeditions || seedState.expeditions.length === 0) {
    console.error(
      'No expeditions found in seed-state.json. Did the seed run successfully?',
    );
    process.exit(1);
  }

  // Build a lookup: archive title → explorer
  const explorerByTitle = new Map();
  for (const item of archive.expeditions || []) {
    const exp = item.expedition;
    if (exp?.title && exp?.explorer) {
      explorerByTitle.set(exp.title, exp.explorer);
    }
  }

  // Build the rename plan
  const plan = [];
  for (const created of seedState.expeditions) {
    const explorer = explorerByTitle.get(created.title);
    if (!explorer) {
      console.warn(
        `[rename] no explorer found in archive for "${created.title}" — skipping`,
      );
      continue;
    }
    const oldTitle = created.title;
    const newTitle = formatTitle(explorer, oldTitle);
    if (oldTitle === newTitle) {
      console.log(`[rename] "${oldTitle}" already prefixed — skipping`);
      continue;
    }
    plan.push({
      expeditionId: created.expeditionId,
      oldTitle,
      newTitle,
    });
  }

  console.log('=== RENAME PLAN ===');
  for (const p of plan) {
    console.log(`  ${p.expeditionId}: "${p.oldTitle}" → "${p.newTitle}"`);
  }
  console.log(`Total: ${plan.length} renames\n`);

  if (cfg.DRY_RUN) {
    console.log('DRY_RUN=true — no API calls will be made.');
    return;
  }

  if (plan.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  cfg.requireAuthEnv();

  const api = new ApiClient();
  console.log(`[rename] base URL: ${api.baseUrl}`);
  console.log(`[rename] logging in as ${cfg.ACCOUNT_EMAIL}`);
  await api.login(cfg.ACCOUNT_EMAIL, cfg.ACCOUNT_PASSWORD);
  console.log(`[rename] login OK\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    try {
      await api._ensureFreshToken();
      await api._fetch('PUT', `/trips/${p.expeditionId}`, {
        body: { title: p.newTitle },
      });
      successCount++;
      console.log(`[${i + 1}/${plan.length}] ✓ ${p.expeditionId}: "${p.newTitle}"`);

      // Update local state file so future re-seeds find by the new title
      const stateEntry = seedState.expeditions.find(
        (e) => e.expeditionId === p.expeditionId,
      );
      if (stateEntry) stateEntry.title = p.newTitle;
      state.persist(seedState);
    } catch (err) {
      errorCount++;
      console.error(`[${i + 1}/${plan.length}] ✗ ${p.expeditionId} FAILED: ${err.message}`);
      if (err.body) console.error(`  body: ${JSON.stringify(err.body).slice(0, 300)}`);
    }
    await sleep(cfg.RATE_LIMIT_MS);
  }

  console.log('');
  console.log('=== RENAME COMPLETE ===');
  console.log(`Renamed: ${successCount}`);
  console.log(`Errors:  ${errorCount}`);
}

run().catch((e) => {
  console.error('[rename] FATAL:', e.message);
  if (e.body) console.error(`  body: ${JSON.stringify(e.body).slice(0, 300)}`);
  process.exit(1);
});
