// One-shot cleanup: delete duplicate expeditions (those without a coverUrl
// in seed-state.json) and any entries currently attached to them, then
// remove them from seed-state.json so the next seed.js run can repost the
// entries onto the original (correct) expeditions.
//
// Soft-delete only — the API sets deleted_at; records remain in the DB.
//
// Usage:
//   DRY_RUN=true node cleanup-duplicates.js   # preview
//   node cleanup-duplicates.js                # live

const cfg = require('./config');
const state = require('./state');
const { ApiClient, sleep } = require('./api');

async function run() {
  const seedState = state.load();

  // Originals = have coverUrl. Duplicates = don't.
  const originals = (seedState.expeditions || []).filter((e) => e.coverUrl);
  const duplicates = (seedState.expeditions || []).filter((e) => !e.coverUrl);
  const entries = seedState.entries || [];

  // All current entries are attached to duplicates (per the state file inspection).
  // Sanity-check this before proceeding.
  const dupeIds = new Set(duplicates.map((d) => d.expeditionId));
  const entriesOnDupes = entries.filter((e) => dupeIds.has(e.expeditionId));
  const entriesOnOrig = entries.filter((e) => !dupeIds.has(e.expeditionId));

  console.log('=== CLEANUP PLAN ===');
  console.log(`Originals (keep): ${originals.length}`);
  console.log(`Duplicates to delete: ${duplicates.length}`);
  console.log(`Entries on duplicates (delete): ${entriesOnDupes.length}`);
  console.log(`Entries on originals (keep in state): ${entriesOnOrig.length}`);
  console.log('');
  console.log('Entries to delete:');
  for (const e of entriesOnDupes) {
    console.log(`  ${e.entryId}  "${e.entryTitle}"`);
  }
  console.log('');
  console.log('Expeditions to delete:');
  for (const d of duplicates) {
    console.log(`  ${d.expeditionId}  "${d.title}"`);
  }
  console.log('');

  if (cfg.DRY_RUN) {
    console.log('DRY_RUN=true — no API calls.');
    return;
  }
  if (duplicates.length === 0 && entriesOnDupes.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  cfg.requireAuthEnv();

  const api = new ApiClient();
  console.log(`[cleanup] base URL: ${api.baseUrl}`);
  await api.login(cfg.ACCOUNT_EMAIL, cfg.ACCOUNT_PASSWORD);
  console.log('[cleanup] login OK\n');

  let entriesDeleted = 0;
  let expeditionsDeleted = 0;
  let errors = 0;

  // Delete entries first
  for (let i = 0; i < entriesOnDupes.length; i++) {
    const e = entriesOnDupes[i];
    const tag = `[entry ${i + 1}/${entriesOnDupes.length}] "${e.entryTitle}"`;
    try {
      await api._ensureFreshToken();
      await api._fetch('DELETE', `/posts/${e.entryId}`);
      entriesDeleted++;
      console.log(`${tag} ✓ deleted`);
    } catch (err) {
      errors++;
      console.error(`${tag} ✗ FAILED: ${err.message}`);
      if (err.body) console.error(`  body: ${JSON.stringify(err.body).slice(0, 300)}`);
    }
    if (i < entriesOnDupes.length - 1) await sleep(cfg.RATE_LIMIT_MS);
  }
  if (entriesOnDupes.length > 0) await sleep(cfg.RATE_LIMIT_MS);

  // Then delete duplicate expeditions
  for (let i = 0; i < duplicates.length; i++) {
    const d = duplicates[i];
    const tag = `[exp ${i + 1}/${duplicates.length}] "${d.title}"`;
    try {
      await api._ensureFreshToken();
      await api._fetch('DELETE', `/trips/${d.expeditionId}`);
      expeditionsDeleted++;
      console.log(`${tag} ✓ deleted`);
    } catch (err) {
      errors++;
      console.error(`${tag} ✗ FAILED: ${err.message}`);
      if (err.body) console.error(`  body: ${JSON.stringify(err.body).slice(0, 300)}`);
    }
    if (i < duplicates.length - 1) await sleep(cfg.RATE_LIMIT_MS);
  }

  // Update state file: keep only originals, drop entries on duplicates
  if (errors === 0) {
    seedState.expeditions = originals;
    seedState.entries = entriesOnOrig;
    state.persist(seedState);
    console.log('\n[cleanup] seed-state.json updated');
  } else {
    console.log('\n[cleanup] errors occurred — seed-state.json NOT updated. Re-run after fixing.');
  }

  console.log('');
  console.log('=== CLEANUP COMPLETE ===');
  console.log(`Entries deleted:      ${entriesDeleted}`);
  console.log(`Expeditions deleted:  ${expeditionsDeleted}`);
  console.log(`Errors:               ${errors}`);
  console.log('');
  console.log('Next: run `node seed.js` to repost the 7 Endurance entries onto the original expedition.');
}

run().catch((e) => {
  console.error('[cleanup] FATAL:', e.message);
  process.exit(1);
});
