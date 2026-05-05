const fs = require('fs');
const cfg = require('./config');

function load() {
  if (!fs.existsSync(cfg.STATE_FILE)) {
    return { startedAt: null, expeditions: [], entries: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(cfg.STATE_FILE, 'utf-8'));
  } catch (e) {
    throw new Error(
      `Failed to parse ${cfg.STATE_FILE}: ${e.message}. Delete or repair the file before retrying.`,
    );
  }
}

// Atomic-ish write: write to a temp file, then rename. Avoids torn writes if
// the process is killed mid-flush.
function persist(state) {
  const tmp = cfg.STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, cfg.STATE_FILE);
}

// Match by archive title OR an alternate (e.g. the prefixed title written by
// rename.js). Pass any number of candidate strings — first hit wins.
function findExpedition(state, ...titles) {
  for (const t of titles) {
    if (!t) continue;
    const hit = state.expeditions.find((e) => e.title === t);
    if (hit) return hit;
  }
  return undefined;
}

function findEntry(state, expeditionId, entryTitle) {
  return state.entries.find(
    (e) => e.expeditionId === expeditionId && e.entryTitle === entryTitle,
  );
}

module.exports = { load, persist, findExpedition, findEntry };
