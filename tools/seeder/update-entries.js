// One-shot: bring already-posted entries up to date with the current
// archive.json. PUTs entryType='historical' AND the latest body content
// (e.g. after stripping Gutenberg underscore-italics markers).
//
// Matches state.entries[] back to archive.json by (expeditionId, entryTitle).
//
// Usage:
//   DRY_RUN=true node update-entries.js     # preview text/metadata changes
//   node update-entries.js                  # live text/metadata sync
//   PHOTOS=true node update-entries.js      # also sync photos (re-upload
//                                           # changed URLs, refresh captions
//                                           # and credits, replace media).
//                                           # State tracks photoSourceUrls so
//                                           # caption-only edits skip uploads.
//
//   ONLY="title1,title2" node …             # scope updates to entries whose
//                                           # title matches any token as a
//                                           # case-insensitive substring.
//                                           # Use this on the first PHOTOS run
//                                           # to avoid re-uploading every
//                                           # entry's photos (state has no
//                                           # URL history yet).
//
// Photo limit per non-Pro account is 2; the seeder slices to that. Pacing
// between uploads matches seed.js (7s) to stay under the 10/min throttle.

const fs = require('fs');
const cfg = require('./config');
const state = require('./state');
const { ApiClient, sleep } = require('./api');
const { downloadImage, uploadToS3 } = require('./media');

const MAX_PHOTOS_PER_ENTRY = 2;
const PHOTOS_ENABLED = process.env.PHOTOS === 'true';
const PHOTO_UPLOAD_PACE_MS = 7000;

const ONLY_TOKENS = (process.env.ONLY || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function matchesOnlyFilter(entryTitle) {
  if (ONLY_TOKENS.length === 0) return true;
  const t = entryTitle.toLowerCase();
  return ONLY_TOKENS.some((tok) => t.includes(tok));
}

// Build a photo sync plan by diffing archive.entry.photos against the
// state's photoSourceUrls (parallel array to uploadIds). For each desired
// photo we either reuse an existing uploadId (URL already uploaded) or
// schedule a fresh upload. Existing uploadIds whose URL is no longer in
// the desired set get dropped — the API removes them when the new
// `uploads` list omits them.
function planPhotoSync(archiveEntry, stateEntry) {
  const desired = (archiveEntry.photos || []).slice(0, MAX_PHOTOS_PER_ENTRY);
  const stateUrls = stateEntry.photoSourceUrls || [];
  const stateIds = stateEntry.uploadIds || [];

  // Map known URL → uploadId only when the parallel arrays are intact.
  // Older state entries (pre-photoSourceUrls) won't match — every desired
  // photo will need re-upload, and prior uploadIds get removed.
  const knownByUrl = new Map();
  if (stateUrls.length === stateIds.length) {
    for (let i = 0; i < stateUrls.length; i++) {
      knownByUrl.set(stateUrls[i], stateIds[i]);
    }
  }

  const actions = desired.map((photo) => {
    const existingId = knownByUrl.get(photo.url);
    return existingId
      ? { action: 'reuse', photo, uploadId: existingId }
      : { action: 'upload', photo };
  });

  const desiredUrlSet = new Set(desired.map((p) => p.url));
  const removedUploadIds = (stateUrls.length === stateIds.length)
    ? stateIds.filter((_, i) => !desiredUrlSet.has(stateUrls[i]))
    : stateIds; // unknown mapping — replace everything

  return { actions, removedUploadIds };
}

// Execute the plan: upload any 'upload' actions, then return the payload
// fields the PUT needs (uploads, uploadCaptions, uploadCredits,
// coverUploadId). Side effect: stages the new photo state on plan._appliedPhotoState
// so the caller can persist it after a successful PUT.
async function applyPhotoSync(api, plan, tag) {
  const photoPlan = plan._photoPlan || planPhotoSync(plan.archiveEntry, plan.stateEntry);

  const uploadIds = [];
  const uploadCaptions = {};
  const uploadCredits = {};
  const photoSourceUrls = [];

  let uploadIndex = 0;
  const uploadCount = photoPlan.actions.filter((a) => a.action === 'upload').length;

  for (const a of photoPlan.actions) {
    let uploadId;
    if (a.action === 'reuse') {
      uploadId = a.uploadId;
    } else {
      uploadIndex++;
      console.log(`${tag} photo ${uploadIndex}/${uploadCount} downloading…`);
      const image = await downloadImage(a.photo.url);
      console.log(`${tag} photo ${uploadIndex} uploading (${image.buffer.length} bytes)…`);
      const up = await uploadToS3(api, image);
      uploadId = up.uploadId;
      if (uploadIndex < uploadCount) await sleep(PHOTO_UPLOAD_PACE_MS);
    }
    uploadIds.push(uploadId);
    photoSourceUrls.push(a.photo.url);
    if (a.photo.caption) uploadCaptions[uploadId] = a.photo.caption;
    if (a.photo.credit) uploadCredits[uploadId] = a.photo.credit;
  }

  plan._appliedPhotoState = { uploadIds, photoSourceUrls };

  const payload = {
    uploads: uploadIds,
    uploadCaptions,
    uploadCredits,
  };
  if (uploadIds.length > 0) payload.coverUploadId = uploadIds[0];
  return payload;
}

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
    if (!matchesOnlyFilter(e.entryTitle)) {
      skipped.push({ ...e, reason: 'filtered out by ONLY' });
      continue;
    }
    plan.push({
      stateEntry: e,
      archiveEntry,
      entryId: e.entryId,
      entryTitle: e.entryTitle,
      content: archiveEntry.body.trim(),
      // Title currently stored with explorer prefix; preserve by sending
      // the same prefix the seeder used.
      title: `${archiveExp.expedition.explorer} - ${e.entryTitle}`,
      entryType: 'historical',
      // Date can shift when a config's anchor moves to a more accurate
      // start of a multi-day passage (e.g. Nansen's farthest-north push
      // moving from Apr 7 to Apr 5). Push the latest archive date too.
      date: archiveEntry.date,
      // Coords + place can also shift if the archive entry was edited.
      lat: archiveEntry.coordinates?.lat,
      lon: archiveEntry.coordinates?.lng,
    });
  }

  console.log('=== UPDATE PLAN ===');
  if (PHOTOS_ENABLED) console.log('  (PHOTOS=true — photos will be synced)');
  for (const p of plan) {
    let suffix = '';
    if (PHOTOS_ENABLED) {
      const photoPlan = planPhotoSync(p.archiveEntry, p.stateEntry);
      p._photoPlan = photoPlan;
      const reuse = photoPlan.actions.filter((a) => a.action === 'reuse').length;
      const upload = photoPlan.actions.filter((a) => a.action === 'upload').length;
      const desired = photoPlan.actions.length;
      const remove = photoPlan.removedUploadIds.length;
      suffix = `, photos: ${desired} desired (${reuse} reuse, ${upload} new${remove ? `, ${remove} removed` : ''})`;
    }
    console.log(
      `  ${p.entryId}  "${p.entryTitle}"  → entryType=historical, content=${p.content.length} chars${suffix}`,
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
      const body = {
        title: p.title,
        content: p.content,
        entryType: p.entryType,
      };
      if (p.date) body.date = p.date;
      if (typeof p.lat === 'number') body.lat = p.lat;
      if (typeof p.lon === 'number') body.lon = p.lon;

      if (PHOTOS_ENABLED) {
        const photoFields = await applyPhotoSync(api, p, tag);
        Object.assign(body, photoFields);
      }

      await api._fetch('PUT', `/posts/${p.entryId}`, { body });

      // Persist updated photo state only after a successful PUT — otherwise
      // a failed PUT followed by re-run would think the photo was synced.
      if (PHOTOS_ENABLED && p._appliedPhotoState) {
        Object.assign(p.stateEntry, p._appliedPhotoState);
        state.persist(seedState);
      }

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
