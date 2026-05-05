const fs = require('fs');
const cfg = require('./config');
const state = require('./state');
const { ApiClient, HttpError, sleep } = require('./api');
const { downloadImage, uploadToS3 } = require('./media');
const validator = require('./validate');
const {
  isPlaceholder,
  expeditionToPayload,
  entryToPayload,
  formatTitle,
} = require('./transform');

// Standard accounts cap at 2 uploads per entry. Pro is 10.
const MAX_PHOTOS_PER_ENTRY = 2;

async function uploadEntryPhotos(api, entry, entryLabel) {
  if (!Array.isArray(entry.photos) || entry.photos.length === 0) {
    return { uploads: [], uploadCaptions: {}, uploadCredits: {}, coverUploadId: undefined };
  }
  const photos = entry.photos.slice(0, MAX_PHOTOS_PER_ENTRY);
  const uploads = [];
  const uploadCaptions = {};
  const uploadCredits = {};
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    console.log(`${entryLabel} photo ${i + 1}/${photos.length} downloading…`);
    const image = await downloadImage(p.url);
    console.log(`${entryLabel} photo ${i + 1} uploading (${image.buffer.length} bytes)…`);
    const up = await uploadToS3(api, image);
    uploads.push(up.uploadId);
    if (p.caption) uploadCaptions[up.uploadId] = p.caption;
    if (p.credit) uploadCredits[up.uploadId] = p.credit;
    // Pace under upload throttle (10/min)
    if (i < photos.length - 1) await sleep(7000);
  }
  return {
    uploads,
    uploadCaptions,
    uploadCredits,
    coverUploadId: uploads[0],
  };
}

function loadArchive() {
  return JSON.parse(fs.readFileSync(cfg.ARCHIVE_FILE, 'utf-8'));
}

async function maybePause(api, counter) {
  await sleep(cfg.RATE_LIMIT_MS);
  if (counter.calls > 0 && counter.calls % cfg.BATCH_PAUSE_EVERY === 0) {
    console.log(
      `[pace] ${counter.calls} requests sent — pausing ${cfg.BATCH_PAUSE_MS}ms to clear medium throttle`,
    );
    await sleep(cfg.BATCH_PAUSE_MS);
  }
}

function logError(prefix, err) {
  if (err instanceof HttpError) {
    console.error(`${prefix} HTTP ${err.status}: ${err.message}`);
    if (err.body)
      console.error(`  body: ${JSON.stringify(err.body).slice(0, 500)}`);
  } else {
    console.error(`${prefix} ${err.message || err}`);
  }
}

async function run() {
  const startedAt = Date.now();

  console.log('[seed] loading archive');
  const archive = loadArchive();

  console.log('[seed] running validator');
  const { ok, summary } = validator.run();
  if (!ok) {
    console.error('[seed] validation errors present — aborting');
    process.exit(1);
  }

  if (cfg.DRY_RUN) {
    console.log('');
    console.log('[seed] DRY_RUN=true — no API calls will be made. Exiting.');
    return;
  }

  cfg.requireAuthEnv();

  // Load (or initialize) state
  const seedState = state.load();
  if (!seedState.startedAt) seedState.startedAt = new Date().toISOString();
  state.persist(seedState);

  // Login
  const api = new ApiClient();
  console.log(`[seed] base URL: ${api.baseUrl}`);
  console.log(`[seed] logging in as ${cfg.ACCOUNT_EMAIL}`);
  const { user } = await api.login(cfg.ACCOUNT_EMAIL, cfg.ACCOUNT_PASSWORD);
  console.log(
    `[seed] logged in as @${user.username} (id=${user.id}, role=${user.role}, verified=${user.isEmailVerified})`,
  );

  const counter = { calls: 0 };
  const stats = {
    expeditionsCreated: 0,
    expeditionsResumed: 0,
    entriesPosted: 0,
    entriesResumed: 0,
    entriesSkippedPlaceholder: 0,
    errors: 0,
  };

  const items = archive.expeditions || [];

  for (let i = 0; i < items.length; i++) {
    const exp = items[i].expedition;
    const entries = items[i].entries || [];
    const expLabel = `[${exp.title}]`;

    // Resume or create expedition. Match against either the raw archive title
    // OR the prefixed title (rename.js writes prefixed titles into state).
    let expeditionId;
    const existingExp = state.findExpedition(
      seedState,
      exp.title,
      formatTitle(exp.explorer, exp.title),
    );
    if (existingExp) {
      expeditionId = existingExp.expeditionId;
      stats.expeditionsResumed++;
      console.log(
        `${expLabel} resumed (expeditionId=${expeditionId})`,
      );
    } else {
      const payload = expeditionToPayload(exp);
      // CRITICAL: do NOT include `status` — keeps EXPEDITION_PUBLISHED event
      // from firing. The saved status still auto-derives from dates.
      try {
        counter.calls++;
        const res = await api.createExpedition(payload);
        expeditionId = res.expeditionId;
        seedState.expeditions.push({
          title: exp.title,
          expeditionId,
          createdAt: new Date().toISOString(),
        });
        state.persist(seedState);
        stats.expeditionsCreated++;
        console.log(
          `${expLabel} created (expeditionId=${expeditionId}) ${i + 1}/${items.length}`,
        );
      } catch (err) {
        stats.errors++;
        logError(`${expLabel} create FAILED:`, err);
        if (cfg.STOP_ON_ERROR) {
          console.error('[seed] STOP_ON_ERROR=true — aborting');
          process.exit(1);
        }
        continue;
      }
      await maybePause(api, counter);
    }

    // Entries
    for (let j = 0; j < entries.length; j++) {
      const entry = entries[j];
      const entryLabel = `${expLabel} entry ${j + 1}/${entries.length} '${entry.title}'`;

      if (isPlaceholder(entry.body)) {
        stats.entriesSkippedPlaceholder++;
        console.log(`${entryLabel} → skipped (PLACEHOLDER)`);
        continue;
      }

      const existingEntry = state.findEntry(
        seedState,
        expeditionId,
        entry.title,
      );
      if (existingEntry) {
        stats.entriesResumed++;
        console.log(
          `${entryLabel} → resumed (entryId=${existingEntry.entryId})`,
        );
        continue;
      }

      let basePayload;
      try {
        basePayload = entryToPayload(entry, exp, expeditionId);
        const photoFields = await uploadEntryPhotos(api, entry, entryLabel);
        const payload = { ...basePayload, ...photoFields };
        counter.calls++;
        const res = await api.createEntry(payload);
        const entryId = res.id;
        seedState.entries.push({
          expeditionId,
          entryTitle: entry.title,
          entryId,
          uploadIds: photoFields.uploads,
        });
        state.persist(seedState);
        stats.entriesPosted++;
        const photoNote = photoFields.uploads.length
          ? ` with ${photoFields.uploads.length} photo(s)`
          : '';
        console.log(`${entryLabel} → posted (entryId=${entryId})${photoNote} ✓`);
      } catch (err) {
        stats.errors++;
        logError(`${entryLabel} FAILED:`, err);
        if (cfg.STOP_ON_ERROR) {
          console.error('[seed] STOP_ON_ERROR=true — aborting');
          process.exit(1);
        }
        continue;
      }
      await maybePause(api, counter);
    }
  }

  const durationS = Math.round((Date.now() - startedAt) / 1000);

  console.log('');
  console.log('=== SEED COMPLETE ===');
  console.log(
    `Expeditions created: ${stats.expeditionsCreated} (resumed: ${stats.expeditionsResumed})`,
  );
  console.log(
    `Entries posted: ${stats.entriesPosted} (resumed: ${stats.entriesResumed})`,
  );
  console.log(`Entries skipped (placeholder): ${stats.entriesSkippedPlaceholder}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Duration: ${durationS}s`);
  console.log('');
  console.log(`State persisted at ${cfg.STATE_FILE}`);
  console.log('Re-run safely — created records will be skipped on the next run.');
}

if (require.main === module) {
  run().catch((e) => {
    console.error('[seed] FATAL:');
    logError('', e);
    process.exit(1);
  });
}

module.exports = { run };
