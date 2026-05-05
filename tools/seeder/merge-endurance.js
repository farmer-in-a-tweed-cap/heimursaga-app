// Merge extracted Endurance bodies and photo URLs into archive.json.
// Run after extract-endurance.js produces entries-endurance.json and after
// entry-photos-endurance.json is curated.
//
// Idempotent — running twice produces the same archive.json.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ARCHIVE = path.join(ROOT, 'archive.json');
const BODIES = path.join(ROOT, 'entries-endurance.json');
const PHOTOS = path.join(ROOT, 'entry-photos-endurance.json');

const TARGET_EXPEDITION = 'The Endurance Expedition';

const bodies = JSON.parse(fs.readFileSync(BODIES, 'utf-8'));
const photos = JSON.parse(fs.readFileSync(PHOTOS, 'utf-8'));
const archive = JSON.parse(fs.readFileSync(ARCHIVE, 'utf-8'));

const bodyByTitle = new Map(bodies.map((b) => [b.title, b.body]));
const photosByTitle = new Map(photos.map((p) => [p.title, p.photos || []]));

const expeditionItem = (archive.expeditions || []).find(
  (it) => it.expedition?.title === TARGET_EXPEDITION,
);
if (!expeditionItem) {
  console.error(`Could not find expedition "${TARGET_EXPEDITION}" in archive.json`);
  process.exit(1);
}

let updatedBodies = 0;
let updatedPhotos = 0;
let skipped = 0;

for (const entry of expeditionItem.entries) {
  const newBody = bodyByTitle.get(entry.title);
  const newPhotos = photosByTitle.get(entry.title);

  if (newBody) {
    entry.body = newBody;
    updatedBodies++;
  } else {
    skipped++;
  }

  if (newPhotos && newPhotos.length > 0) {
    entry.photos = newPhotos;
    updatedPhotos++;
  }
}

fs.writeFileSync(ARCHIVE, JSON.stringify(archive, null, 2) + '\n');

console.log(`[merge] updated ${updatedBodies} bodies, ${updatedPhotos} photo lists in ${TARGET_EXPEDITION}`);
console.log(`[merge] ${skipped} entries had no matching body (kept PLACEHOLDER)`);
console.log(`[merge] wrote ${ARCHIVE}`);
