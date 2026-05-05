// Generic extractor: reads a per-expedition config and pulls verbatim
// passages from a Project Gutenberg / Internet Archive plain-text source.
//
// Usage:
//   node extract.js <expedition-name>
//
// Where <expedition-name> matches a file in extract-configs/<name>.json.
// Caches the source text under cache/ to avoid re-downloading.
// Writes entries-<name>.json with passages keyed by entry title.
//
// All processing is local — no LLM is involved in producing the text.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CACHE_DIR = path.join(ROOT, 'cache');
const CONFIGS_DIR = path.join(ROOT, 'extract-configs');

const TARGET_WORDS_MIN = 1100;
const TARGET_WORDS_MAX = 1500;
const MAX_CHARS = 10000;
const USER_AGENT = 'HeimursagaSeeder/0.1 (+https://heimursaga.com)';

function usage(msg) {
  if (msg) console.error(msg);
  console.error('Usage: node extract.js <expedition-name>');
  console.error('Example: node extract.js endurance');
  console.error('');
  console.error('Available configs:');
  if (fs.existsSync(CONFIGS_DIR)) {
    for (const f of fs.readdirSync(CONFIGS_DIR)) {
      if (f.endsWith('.json')) console.error(`  - ${f.replace(/\.json$/, '')}`);
    }
  }
  process.exit(1);
}

function loadConfig(name) {
  const file = path.join(CONFIGS_DIR, `${name}.json`);
  if (!fs.existsSync(file)) usage(`Config not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

async function fetchOneSource(source) {
  const cachePath = path.join(CACHE_DIR, source.cache);
  if (fs.existsSync(cachePath)) {
    console.log(`[extract] using cached ${cachePath}`);
    return fs.readFileSync(cachePath, 'utf-8');
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  let lastErr;
  for (const url of source.urls) {
    try {
      console.log(`[extract] fetching ${url}`);
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) {
        lastErr = `HTTP ${res.status} on ${url}`;
        continue;
      }
      const text = await res.text();
      fs.writeFileSync(cachePath, text);
      console.log(`[extract] cached ${text.length} bytes to ${cachePath}`);
      return text;
    } catch (e) {
      lastErr = e.message;
    }
  }
  throw new Error(`All URLs failed for ${source.cache}: ${lastErr}`);
}

// Supports either { source: { urls, cache } } (single volume) or
// { sources: [{ urls, cache }, ...] } (multi-volume — concatenated in order).
// Returns { framed, volumeStarts } where volumeStarts[i] is the character
// offset in `framed` where volume i begins (volumeStarts[0] === 0).
async function ensureSource(config) {
  const sources = config.sources || (config.source ? [config.source] : []);
  if (sources.length === 0) throw new Error('config has no source(s)');
  const texts = [];
  for (const s of sources) {
    texts.push(stripGutenbergFrame(await fetchOneSource(s)));
  }
  const SEP = '\n\n=== VOLUME BREAK ===\n\n';
  const volumeStarts = [];
  let acc = '';
  for (let i = 0; i < texts.length; i++) {
    volumeStarts.push(acc.length);
    acc += (i > 0 ? SEP : '') + texts[i];
  }
  return { framed: acc, volumeStarts };
}

function stripGutenbergFrame(text) {
  for (const re of [
    /\*\*\*\s*START OF (?:THE |THIS )?PROJECT GUTENBERG[^\n]*\n/i,
    /\*\*\* START OF[^\n]*\n/i,
  ]) {
    const m = text.match(re);
    if (m) {
      text = text.slice(m.index + m[0].length);
      break;
    }
  }
  for (const re of [
    /\*\*\*\s*END OF (?:THE |THIS )?PROJECT GUTENBERG[^\n]*/i,
    /\*\*\* END OF[^\n]*/i,
  ]) {
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
  if (t.length < 80 && /^[A-Z0-9 .,'":;\-—()&?!]+$/.test(t) && /[A-Z]/.test(t))
    return true;
  if (/^\s*\[Pg \d+\]\s*$/.test(t)) return true;
  if (/^\s*\d+\s*$/.test(t)) return true;
  return false;
}

function cleanParagraph(p) {
  let cleaned = p
    .replace(/\[Pg \d+\]/g, '')
    .replace(/\[Footnote[^\]]*\]/g, '')
    // Strip Gutenberg editor attribution brackets like [Clark, November 20,
    // 1804] that appear at the start of every paragraph in the Lewis &
    // Clark journals. Pattern: [Word, ... date]  with no nested brackets.
    .replace(/\[[A-Z][a-zA-Z]+,\s+[^\]]+,\s+\d{4}\]\s*/g, '')
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, '')
    // Strip Gutenberg's _word_ italic markers (ship names, book titles).
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip leading and trailing quote characters from each paragraph.
  // Nansen's English edition (and similar period travel writing) wraps
  // journal entries in `"`, opening at the start of a quoted day and
  // closing at the end. When passages are excerpted these marks survive
  // as orphaned opening/closing quotes — strip them. Smart and straight
  // quotes both handled.
  cleaned = cleaned.replace(/^["“”]+\s*/, '').replace(/\s*["“”]+$/, '');
  return cleaned;
}

function paragraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}

function wordCount(s) {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function buildPassage(paras, startIdx) {
  const out = [];
  let totalWords = 0;
  let totalChars = 0;
  for (let i = startIdx; i < paras.length; i++) {
    const cleaned = cleanParagraph(paras[i]);
    if (!cleaned) continue;
    if (isChapterHeading(cleaned)) {
      if (out.length > 0) break;
      else continue;
    }
    const wc = wordCount(cleaned);
    const newWords = totalWords + wc;
    const newChars = totalChars + cleaned.length + (out.length ? 2 : 0);
    if (out.length > 0 && (newWords > TARGET_WORDS_MAX || newChars > MAX_CHARS)) {
      break;
    }
    out.push(cleaned);
    totalWords = newWords;
    totalChars = newChars;
    if (totalWords >= TARGET_WORDS_MIN && /[.!?]"?\s*$/.test(cleaned)) {
      if (totalWords >= TARGET_WORDS_MAX - 100) break;
    }
  }
  return out.join('\n\n');
}

function compileAnchors(anchors) {
  return (anchors || []).map((s) => new RegExp(s, 'i'));
}

function findAnchor(paras, anchorRegexes, fromIdx = 0) {
  for (let i = fromIdx; i < paras.length; i++) {
    for (const re of anchorRegexes) {
      if (re.test(paras[i])) return i;
    }
  }
  return -1;
}

async function main() {
  const name = process.argv[2];
  if (!name) usage('Missing expedition name');

  const config = loadConfig(name);
  const outputDir = path.join(ROOT, 'expedition-data', config.name);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, 'entries.json');

  console.log(`[extract] expedition: "${config.expedition}"`);
  // ensureSource strips Gutenberg frames per-volume; volumeStarts is char
  // offsets so we can map to paragraph indices for per-volume scoping.
  const { framed, volumeStarts } = await ensureSource(config);
  const paras = paragraphs(framed);
  console.log(`[extract] ${paras.length} paragraphs after framing (${volumeStarts.length} volume(s))`);

  // Compute the paragraph index where each volume starts.
  const volumeParaStarts = volumeStarts.map((charOffset) => {
    if (charOffset === 0) return 0;
    // Walk paragraphs counting char positions. We use the same split rule
    // (\n\s*\n with paragraph trimming/joining) so this is approximate but
    // good enough for cursor-anchoring; we only need to land in the right
    // volume, not at an exact paragraph.
    const before = framed.slice(0, charOffset);
    const beforeParas = before.split(/\n\s*\n/).filter((p) => p.trim()).length;
    return beforeParas;
  });

  const results = [];
  let cursor = 0;

  for (const entry of config.entries || []) {
    const anchors = compileAnchors(entry.anchors);
    // If entry specifies a volume (1-indexed), reset cursor to that volume's
    // start (but never go backwards past where we already are — cursor is
    // monotonic to enforce chronological ordering).
    if (entry.volume && volumeParaStarts[entry.volume - 1] !== undefined) {
      const volStart = volumeParaStarts[entry.volume - 1];
      if (volStart > cursor) cursor = volStart;
    }
    const idx = findAnchor(paras, anchors, cursor);
    if (idx === -1) {
      console.warn(`[warn] no anchor matched for "${entry.title}"`);
      results.push({
        title: entry.title,
        date: entry.date,
        wordCount: 0,
        charCount: 0,
        body: null,
        note: `No anchor matched. Patterns: ${(entry.anchors || []).join(', ')}`,
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

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n[extract] wrote ${outputFile}`);

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
      `  ${flag}  ${(r.title || '').padEnd(34)}  ${r.wordCount} words / ${r.charCount} chars`,
    );
  }
}

main().catch((e) => {
  console.error('[extract] FAILED:', e.message);
  process.exit(1);
});
