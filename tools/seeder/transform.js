const cfg = require('./config');

const PLACEHOLDER = 'PLACEHOLDER';

function isPlaceholder(body) {
  return typeof body === 'string' && body.includes(PLACEHOLDER);
}

function wordCount(s) {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function smartTruncate(s, max) {
  if (!s || s.length <= max) return s;
  const slice = s.slice(0, max - 1);
  const lastStop = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('! '),
  );
  if (lastStop > max * 0.6) return slice.slice(0, lastStop + 1) + '…';
  return slice + '…';
}

function derivePlace(entry, expedition) {
  const note = entry.coordinates_note || '';
  const segments = note
    .split(/\s+—\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const candidate = segments.find(
    (s) => s.toLowerCase() !== 'approximate',
  );
  const place = candidate || expedition.region || 'Unknown';
  return place.slice(0, cfg.MAX_PLACE_CHARS);
}

function isValidISODate(s) {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(s);
}

// Prepend explorer name: "Roald Amundsen - South Pole Expedition".
// Defensive against double-prefixing in case archive titles ever start
// with the explorer name themselves.
function formatTitle(explorer, title) {
  const t = (title || '').trim();
  const e = (explorer || '').trim();
  if (!e) return t;
  if (t.startsWith(e)) return t;
  return `${e} - ${t}`;
}

function expeditionToPayload(exp) {
  return {
    title: formatTitle(exp.explorer, exp.title),
    description: smartTruncate(
      (exp.description || '').trim(),
      cfg.MAX_DESCRIPTION_CHARS,
    ),
    startDate: exp.start_date,
    endDate: exp.end_date,
    region: exp.region,
    visibility: 'public',
    public: true,
  };
}

function entryToPayload(entry, expedition, expeditionId) {
  const payload = {
    title: formatTitle(expedition.explorer, entry.title),
    content: (entry.body || '').trim(),
    place: derivePlace(entry, expedition),
    lat: entry.coordinates?.lat,
    lon: entry.coordinates?.lng,
    date: entry.date,
    expeditionId,
    entryType: 'historical',
    public: true,
    visibility: 'public',
    isDraft: false,
  };
  // Editorial intro travels through entry.metadata so the entry detail page
  // can render it above the verbatim public-domain body. Lives in metadata
  // (existing JSONB) rather than its own column to avoid a schema change.
  if (entry.editorialIntro && entry.editorialIntro.trim()) {
    payload.metadata = { editorialIntro: entry.editorialIntro.trim() };
  }
  return payload;
}

module.exports = {
  PLACEHOLDER,
  isPlaceholder,
  wordCount,
  smartTruncate,
  derivePlace,
  isValidISODate,
  formatTitle,
  expeditionToPayload,
  entryToPayload,
};
