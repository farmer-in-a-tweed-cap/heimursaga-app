// Download Wikimedia images, upload to S3 via /v1/upload, attach to expeditions.
//
// Usage:
//   DRY_RUN=true node cover.js   # preview
//   node cover.js                # live
//
// Idempotent: per-expedition coverUrl is recorded in seed-state.json. Re-runs
// skip expeditions that already have a coverUrl.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const state = require('./state');
const { ApiClient, sleep } = require('./api');
const { formatTitle } = require('./transform');

const COVERS_FILE = path.join(__dirname, 'covers.json');
const ARCHIVE_FILE = cfg.ARCHIVE_FILE;
const USER_AGENT = 'HeimursagaSeeder/0.1 (+https://heimursaga.com)';

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function buildCoverIndex(covers, archive) {
  // Map both raw archive title and prefixed title → cover entry.
  const index = new Map();
  const coverByArchiveTitle = new Map();
  for (const c of covers) coverByArchiveTitle.set(c.title, c);

  for (const item of archive.expeditions || []) {
    const exp = item.expedition;
    if (!exp?.title) continue;
    const cover = coverByArchiveTitle.get(exp.title);
    if (!cover) continue;
    index.set(exp.title, cover);
    const prefixed = formatTitle(exp.explorer, exp.title);
    if (prefixed !== exp.title) index.set(prefixed, cover);
  }
  return index;
}

async function downloadImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Download ${url} failed: HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Download ${url}: unexpected content-type ${contentType}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // Pull a clean filename from the URL path
  const decoded = decodeURIComponent(new URL(url).pathname);
  const filename = path.basename(decoded) || 'image.jpg';
  return { buffer: buf, contentType, filename };
}

async function uploadToS3(api, image) {
  const form = new FormData();
  const blob = new Blob([image.buffer], { type: image.contentType });
  form.append('file', blob, image.filename);

  // Custom multipart upload: /api.js _fetch always JSON-stringifies the body,
  // so we hand-roll the request here using the same auth headers.
  await api._ensureFreshToken();
  const url = `${api.baseUrl}/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${api.token}` },
    body: form,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `Upload failed HTTP ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  if (!json?.original) {
    throw new Error(`Upload response missing 'original' field: ${text.slice(0, 300)}`);
  }
  return { uploadId: json.uploadId, url: json.original };
}

async function attachCover(api, expeditionId, currentTitle, s3Url) {
  await api._ensureFreshToken();
  await api._fetch('PUT', `/trips/${expeditionId}`, {
    body: { title: currentTitle, coverImage: s3Url },
  });
}

async function run() {
  const covers = loadJson(COVERS_FILE);
  const archive = loadJson(ARCHIVE_FILE);
  const seedState = state.load();

  if (!seedState.expeditions || seedState.expeditions.length === 0) {
    console.error('seed-state.json has no expeditions. Did the seed run?');
    process.exit(1);
  }

  const coverIndex = buildCoverIndex(covers, archive);

  // Build the plan
  const plan = [];
  for (const created of seedState.expeditions) {
    if (created.coverUrl) {
      console.log(
        `[skip] "${created.title}" already has cover ${created.coverUrl}`,
      );
      continue;
    }
    const cover = coverIndex.get(created.title);
    if (!cover) {
      console.warn(`[warn] no cover entry for "${created.title}" — skipping`);
      continue;
    }
    plan.push({
      stateEntry: created,
      expeditionId: created.expeditionId,
      title: created.title,
      sourceUrl: cover.url,
      caption: cover.caption,
    });
  }

  console.log('');
  console.log('=== COVER PLAN ===');
  for (const p of plan) {
    console.log(`  ${p.expeditionId}  ${p.title}`);
    console.log(`    ← ${p.sourceUrl}`);
  }
  console.log(`Total: ${plan.length} covers to attach\n`);

  if (cfg.DRY_RUN) {
    console.log('DRY_RUN=true — no downloads, no uploads, no PUTs.');
    return;
  }
  if (plan.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  cfg.requireAuthEnv();

  const api = new ApiClient();
  console.log(`[cover] base URL: ${api.baseUrl}`);
  await api.login(cfg.ACCOUNT_EMAIL, cfg.ACCOUNT_PASSWORD);
  console.log(`[cover] login OK\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const tag = `[${i + 1}/${plan.length}] ${p.title}`;
    try {
      console.log(`${tag} downloading…`);
      const image = await downloadImage(p.sourceUrl);
      console.log(`  ${image.buffer.length} bytes, ${image.contentType}, name=${image.filename}`);

      console.log(`${tag} uploading to /v1/upload…`);
      const uploaded = await uploadToS3(api, image);
      console.log(`  → ${uploaded.url}`);

      console.log(`${tag} attaching cover…`);
      await attachCover(api, p.expeditionId, p.title, uploaded.url);

      // Persist progress
      p.stateEntry.coverUrl = uploaded.url;
      p.stateEntry.coverUploadId = uploaded.uploadId;
      p.stateEntry.coverSource = p.sourceUrl;
      state.persist(seedState);

      console.log(`${tag} ✓ done`);
      success++;
    } catch (err) {
      errors++;
      console.error(`${tag} ✗ FAILED: ${err.message}`);
      if (cfg.STOP_ON_ERROR) {
        console.error('[cover] STOP_ON_ERROR=true — aborting');
        process.exit(1);
      }
    }
    // Upload throttle is 10/min — pace at 7s/call to stay safe
    if (i < plan.length - 1) await sleep(7000);
  }

  console.log('');
  console.log('=== COVER COMPLETE ===');
  console.log(`Attached: ${success}`);
  console.log(`Errors:   ${errors}`);
}

run().catch((e) => {
  console.error('[cover] FATAL:', e.message);
  process.exit(1);
});
