// Merge extracted bodies, curated photos, and editorial intros for one
// expedition into archive.json.
//
// Usage:
//   node merge.js <expedition-name>
//
// Inputs (all optional except entries; missing inputs are silently skipped):
//   - extract-configs/<name>.json       (provides expedition title)
//   - entries-<name>.json               (extractor output — body text)
//   - entry-photos-<name>.json          (curated photo URLs)
//   - entry-intros-<name>.json          (editorial intros)
//
// Idempotent — run repeatedly to incorporate edits.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function usage(msg) {
  if (msg) console.error(msg);
  console.error('Usage: node merge.js <expedition-name>');
  console.error('Example: node merge.js endurance');
  process.exit(1);
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

const name = process.argv[2];
if (!name) usage('Missing expedition name');

const config = readJsonIfExists(path.join(ROOT, 'extract-configs', `${name}.json`));
if (!config?.expedition) {
  usage(`extract-configs/${name}.json missing or has no "expedition" field`);
}

const ARCHIVE = path.join(ROOT, 'archive.json');
const archive = readJsonIfExists(ARCHIVE);
if (!archive) usage('archive.json not found');

const expeditionItem = (archive.expeditions || []).find(
  (it) => it.expedition?.title === config.expedition,
);
if (!expeditionItem) {
  console.error(`[merge] expedition "${config.expedition}" not found in archive.json`);
  process.exit(1);
}

const dataDir = path.join(ROOT, 'expedition-data', name);
const bodies = readJsonIfExists(path.join(dataDir, 'entries.json')) || [];
const photosFile = readJsonIfExists(path.join(dataDir, 'photos.json')) || [];

const bodyByTitle = new Map(bodies.map((b) => [b.title, b.body]));
const photosByTitle = new Map(photosFile.map((p) => [p.title, p.photos || []]));

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

  // Strip any leftover editorialIntro from prior runs. Heimursaga is an
  // anti-AI content platform; editorial intros are not part of the model.
  if (entry.editorialIntro !== undefined) {
    delete entry.editorialIntro;
  }
}

fs.writeFileSync(ARCHIVE, JSON.stringify(archive, null, 2) + '\n');

console.log(`[merge] "${config.expedition}":`);
console.log(`  bodies updated:  ${updatedBodies}`);
console.log(`  photo lists:     ${updatedPhotos}`);
console.log(`  bodies skipped (no extracted text): ${skipped}`);
console.log(`[merge] wrote ${ARCHIVE}`);
