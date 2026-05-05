// Extract Endurance entry passages from Project Gutenberg #5199 ("South" by
// Ernest Shackleton). Downloads once, caches in tools/seeder/cache/, then
// finds passages by date anchors and writes entries-endurance.json.
//
// Usage:
//   node extract-endurance.js
//
// Review the output JSON, then merge into archive.json and re-run seed.js.
// All processing is local — no LLM is involved in producing the text.

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
const SOURCE_FILE = path.join(CACHE_DIR, 'pg5199.txt');
const OUTPUT_FILE = path.join(__dirname, 'entries-endurance.json');

const SOURCE_URLS = [
  'https://www.gutenberg.org/cache/epub/5199/pg5199.txt',
  'https://www.gutenberg.org/files/5199/5199-0.txt',
  'https://www.gutenberg.org/ebooks/5199.txt.utf-8',
];

const TARGET_WORDS_MIN = 1100;
const TARGET_WORDS_MAX = 1500;
const MAX_CHARS = 10000;
const USER_AGENT = 'HeimursagaSeeder/0.1 (+https://heimursaga.com)';

// ---- Download / cache --------------------------------------------------

async function ensureSource() {
  if (fs.existsSync(SOURCE_FILE)) {
    console.log(`[extract] using cached ${SOURCE_FILE}`);
    return fs.readFileSync(SOURCE_FILE, 'utf-8');
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  let lastErr;
  for (const url of SOURCE_URLS) {
    try {
      console.log(`[extract] fetching ${url}`);
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) {
        lastErr = `HTTP ${res.status} on ${url}`;
        continue;
      }
      const text = await res.text();
      fs.writeFileSync(SOURCE_FILE, text);
      console.log(`[extract] cached ${text.length} bytes to ${SOURCE_FILE}`);
      return text;
    } catch (e) {
      lastErr = e.message;
    }
  }
  throw new Error(`All Gutenberg URLs failed: ${lastErr}`);
}

// ---- Cleaning ----------------------------------------------------------

function stripGutenbergFrame(text) {
  const startMatches = [
    /\*\*\*\s*START OF (?:THE |THIS )?PROJECT GUTENBERG[^\n]*\n/i,
    /\*\*\* START OF[^\n]*\n/i,
  ];
  for (const re of startMatches) {
    const m = text.match(re);
    if (m) {
      text = text.slice(m.index + m[0].length);
      break;
    }
  }
  const endMatches = [
    /\*\*\*\s*END OF (?:THE |THIS )?PROJECT GUTENBERG[^\n]*/i,
    /\*\*\* END OF[^\n]*/i,
  ];
  for (const re of endMatches) {
    const m = text.match(re);
    if (m) {
      text = text.slice(0, m.index);
      break;
    }
  }
  return text;
}

function isChapterHeading(p) {
  const t = p.trim();
  if (t.length === 0) return true;
  if (/^CHAPTER\b/i.test(t) && t.length < 80) return true;
  // All-caps paragraph under 80 chars → likely heading
  if (t.length < 80 && /^[A-Z0-9 .,'":;\-—()&?!]+$/.test(t) && /[A-Z]/.test(t)) return true;
  if (/^\s*\[Pg \d+\]\s*$/.test(t)) return true;
  if (/^\s*\d+\s*$/.test(t)) return true; // standalone page number
  return false;
}

function cleanParagraph(p) {
  return p
    .replace(/\[Pg \d+\]/g, '')
    .replace(/\[Footnote[^\]]*\]/g, '')
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, '')
    // Project Gutenberg uses _word_ to denote italics in the original print
    // edition (ship names, book titles, foreign words). We're posting plain
    // text with no italic rendering, so strip the markers.
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function paragraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}

// ---- Passage finder ----------------------------------------------------

function wordCount(s) {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Build an extracted passage from a paragraph array starting at `startIdx`.
// Greedily appends paragraphs until adding the next would exceed either
// TARGET_WORDS_MAX words or MAX_CHARS chars. Stops early at chapter breaks.
function buildPassage(paras, startIdx) {
  const out = [];
  let totalWords = 0;
  let totalChars = 0;
  for (let i = startIdx; i < paras.length; i++) {
    const cleaned = cleanParagraph(paras[i]);
    if (!cleaned) continue;
    if (isChapterHeading(cleaned)) {
      // Stop at the next chapter — passage shouldn't span chapters
      if (out.length > 0) break;
      else continue; // skip leading heading
    }
    const wc = wordCount(cleaned);
    const newWords = totalWords + wc;
    const newChars = totalChars + cleaned.length + (out.length ? 2 : 0); // +2 for \n\n
    if (out.length > 0 && (newWords > TARGET_WORDS_MAX || newChars > MAX_CHARS)) {
      break;
    }
    out.push(cleaned);
    totalWords = newWords;
    totalChars = newChars;
    if (totalWords >= TARGET_WORDS_MIN && /[.!?]"?\s*$/.test(cleaned)) {
      // Hit min target and ended on sentence boundary — keep going only if
      // we're well below max. This biases toward natural endings.
      if (totalWords >= TARGET_WORDS_MAX - 100) break;
    }
  }
  return out.join('\n\n');
}

// Find paragraph index by anchor regex. Returns first paragraph whose text
// matches, or -1.
function findAnchor(paras, anchorRegexes, fromIdx = 0) {
  for (let i = fromIdx; i < paras.length; i++) {
    for (const re of anchorRegexes) {
      if (re.test(paras[i])) return i;
    }
  }
  return -1;
}

// ---- Entry definitions -------------------------------------------------

// Each entry has multiple anchor patterns to improve match rate. Earlier
// patterns are stronger / more specific. We use the FIRST match found.
const ENTRIES = [
  {
    title: 'Into the Weddell Sea',
    date: '1914-12-07',
    anchors: [
      /December\s+7\b/,
      /December\s+7th\b/i,
      /first\s+pack\b/i,
      /Sanders\s+Island/i,
    ],
  },
  {
    title: 'The Ship in the Ice',
    date: '1915-01-19',
    anchors: [
      /January\s+19\b/,
      /January\s+18\b/,
      /finally\s+beset/i,
      /firmly\s+beset/i,
    ],
    fromHint: 'after December 7 1914',
  },
  {
    title: 'Endurance Crushed',
    date: '1915-10-27',
    anchors: [
      /October\s+27\b/,
      /Ship\s+and\s+stores\s+have\s+gone/i,
      /pressure[- ]?ridges/i,
    ],
    fromHint: 'after January 1915',
  },
  {
    title: 'Ocean Camp on the Ice',
    date: '1915-11-02',
    anchors: [
      /We\s+called\s+this\s+["“]?Ocean\s+Camp/i,
      /established\s+at\s+Ocean\s+Camp/i,
      /This\s+floating\s+lump\s+of\s+ice/i,
    ],
    fromHint: 'after October 27 1915',
  },
  {
    title: 'The James Caird Sets Out',
    date: '1916-04-24',
    anchors: [
      /A\s+boat\s+journey\s+in\s+search\s+of\s+relief/i,
      /South\s+Georgia\s+was\s+over\s+800\s+miles/i,
      /attempt\s+(?:had\s+to|must)\s+be\s+made/i,
    ],
    fromHint: 'after Elephant Island landing',
  },
  {
    title: 'South Georgia at Last',
    date: '1916-05-10',
    anchors: [
      /May\s+10\b/,
      /King\s+Haakon\s+Bay/i,
      /landed\s+(?:on|at)\s+South\s+Georgia/i,
    ],
    fromHint: 'after April 24 1916',
  },
  {
    title: 'Crossing South Georgia',
    date: '1916-05-19',
    anchors: [
      /May\s+19\b/,
      /Stromness/i,
      /unmapped\s+interior/i,
      /crossed\s+the\s+island/i,
    ],
    fromHint: 'after May 10 1916',
  },
];

// ---- Main --------------------------------------------------------------

async function main() {
  const raw = await ensureSource();
  const framed = stripGutenbergFrame(raw);
  const paras = paragraphs(framed);
  console.log(`[extract] ${paras.length} paragraphs after framing`);

  const results = [];
  let cursor = 0; // require monotonic ordering: each entry's anchor must come after the previous

  for (const entry of ENTRIES) {
    const idx = findAnchor(paras, entry.anchors, cursor);
    if (idx === -1) {
      console.warn(`[warn] no anchor matched for "${entry.title}"`);
      results.push({
        title: entry.title,
        date: entry.date,
        wordCount: 0,
        charCount: 0,
        body: null,
        note: `No anchor matched. Patterns: ${entry.anchors.map((r) => r.toString()).join(', ')}`,
      });
      continue;
    }
    const body = buildPassage(paras, idx);
    if (!body) {
      console.warn(`[warn] empty passage for "${entry.title}" at paragraph ${idx}`);
      results.push({
        title: entry.title,
        date: entry.date,
        wordCount: 0,
        charCount: 0,
        body: null,
        note: `Anchor matched at paragraph ${idx} but passage was empty`,
      });
      continue;
    }
    const wc = wordCount(body);
    const cc = body.length;
    console.log(
      `[ok] "${entry.title}" → para ${idx}, ${wc} words, ${cc} chars`,
    );
    results.push({
      title: entry.title,
      date: entry.date,
      wordCount: wc,
      charCount: cc,
      body,
    });
    cursor = idx + 1;
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n[extract] wrote ${OUTPUT_FILE}`);

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    const flag = r.body
      ? r.charCount > MAX_CHARS
        ? '⚠ over char limit'
        : r.wordCount > TARGET_WORDS_MAX
          ? '⚠ over word limit'
          : r.wordCount < TARGET_WORDS_MIN
            ? '⚠ short'
            : '✓'
      : '✗ no body';
    console.log(
      `  ${flag}  ${r.title.padEnd(34)}  ${r.wordCount} words / ${r.charCount} chars`,
    );
  }
}

main().catch((e) => {
  console.error('[extract] FAILED:', e.message);
  process.exit(1);
});
