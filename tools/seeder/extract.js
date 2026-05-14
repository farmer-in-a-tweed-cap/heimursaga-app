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
    texts.push(stripIllustrationMarkers(stripGutenbergFrame(await fetchOneSource(s))));
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

// Strip Gutenberg [Illustration: ...] alt-text blocks. These reference
// figures from the original publication that aren't part of the
// narrative prose. Blocks can span multiple lines (multi-paragraph
// captions), so this runs on the raw source text before paragraph
// splitting. Allows one level of bracket nesting — Shackleton's
// SOUTH appears as `[Illustration: [Cave Cove on South Georgia]` with
// an inner bracket pair. Replaces with two newlines to preserve
// paragraph boundaries on either side.
function stripIllustrationMarkers(text) {
  return text.replace(/\[Illustration(?:[^\[\]]|\[[^\[\]]*\])*\]/g, '\n\n');
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
  if (t.length < 80 && /^[A-Z0-9 .,'":;\-—()&?!]+$/.test(t) && /[A-Z]/.test(t)) {
    // Letter-recipient lines ("TO HIS HIGHNESS ...", "TO THE EARL OF ...")
    // also pass the all-caps test but they are quoted content embedded in
    // the narrative, not real chapter breaks. Excluding them lets the
    // passage continue past short letters.
    if (/^TO\s+(HIS|HER|THE|MR\.|MRS\.|SIR|LORD|LADY|MAJESTY)\b/i.test(t)) return false;
    // Quoted dialog in caps ("DR. LIVINGSTONE, I PRESUME?") is narrative,
    // not a chapter heading. Real chapter headings never start with a quote.
    if (/^["“]/.test(t)) return false;
    return true;
  }
  if (/^\s*\[Pg \d+\]\s*$/.test(t)) return true;
  if (/^\s*\d+\s*$/.test(t)) return true;
  return false;
}

// Detect astronomical / sextant observation tables and similar value
// listings that Gutenberg's text formatting collapses into noisy
// numeric runs after whitespace normalization. Mungo Park's journal
// inserts these for latitude readings ("Mer. alt. of the Sun"); other
// expedition journals do similar. Treated as chapter-break-equivalent
// in buildPassage so emission stops cleanly before them.
function isObservationTable(p) {
  const t = p.trim();
  if (t.length === 0 || t.length > 800) return false;
  // Astro tables: degree symbol plus high digit-density.
  if (/°/.test(t)) {
    const tokens = t.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    const numericTokens = tokens.filter((tok) => /^[-+]?\d/.test(tok)).length;
    if (numericTokens / tokens.length > 0.35) return true;
  }
  // Sextant blocks have repeated horizontal-rule separators between rows.
  if ((t.match(/-{6,}/g) || []).length >= 3) return true;
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
  // Strip orphaned wrap quotes. Period travel writing (Nansen, Livingstone)
  // wraps each diary entry in `"..."`, so when a passage is excerpted the
  // opener or closer may survive as an orphan. But a paragraph that ends
  // with legitimate dialogue (`"...attempt it."`) has a balanced pair —
  // stripping the closer there corrupts the quote.
  //
  // Heuristic: count double quotes (straight + smart). Even → balanced,
  // leave alone. Odd → an orphan exists; strip the one closest to a
  // boundary. Smart quotes are direction-aware (` strips leading `, ”
  // strips trailing); straight `"` is non-directional.
  const quoteCount = (cleaned.match(/["“”]/g) || []).length;
  if (quoteCount % 2 === 1) {
    const lead = cleaned.match(/^["“]\s*/);
    const trail = cleaned.match(/\s*["”]+$/);
    if (lead && !trail) {
      cleaned = cleaned.slice(lead[0].length);
    } else if (trail && !lead) {
      cleaned = cleaned.slice(0, cleaned.length - trail[0].length);
    } else if (lead && trail) {
      // Both ends carry a quote and total is odd — pick the side that
      // looks more orphan-like. A leading `"` followed immediately by a
      // lowercase letter is usually a mid-sentence orphan; otherwise
      // default to stripping the trailing one (Nansen's typical pattern).
      if (/^["“]\s*[a-z]/.test(cleaned)) {
        cleaned = cleaned.slice(lead[0].length);
      } else {
        cleaned = cleaned.slice(0, cleaned.length - trail[0].length);
      }
    }
  }
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

// Detect editor-attribution bracket date like [Clark, October 22, 1804].
// Returns the date string for grouping (or null). Used to dedupe sources
// where multiple paragraphs cover the same date — e.g. the Lewis & Clark
// journals include rough draft AND fair copy of each entry, plus parallel
// Lewis/Clark accounts of the same day.
function paragraphEditorDate(rawPara) {
  const m = rawPara.match(/^\s*\[[A-Z][a-zA-Z]+,\s+([^\]]+,\s+\d{4})\]/);
  return m ? m[1].trim() : null;
}

// Identify non-narrative orderly-book material — court martial records,
// signatures, member lists, "References" topographic notes. The L&C
// journals interleave these with the journal proper and they would
// otherwise land in the body as noise. Some are bracketed
// ([Clark, May 17, 1804] Orders St. Charles…), some aren't — strip the
// editor bracket before checking the lead phrase.
function isAdminFragment(rawPara) {
  const t = rawPara.trim().replace(/^\[[A-Z][a-zA-Z]+,\s+[^\]]+\]\s*/, '');
  return (
    /^Refurences\b/i.test(t) ||
    /^Orders\b/i.test(t) ||
    /^The\s+Court\s+convened\b/i.test(t) ||
    /^Detail\s+for\s+(?:Court|the)/i.test(t) ||
    /^Signd\.?\s+\w/i.test(t) ||
    /^Sgt\.\s+\w+\s+Prs?\.?$/i.test(t) ||
    /^members?\s+(?:[A-Z]\.\s+\w|\w+\s+\w+\s+\w+)/i.test(t) ||
    /^This\s+evening\s+the\s+Detail/i.test(t) ||
    // Standalone signature/admin lines
    /^Capt\.?\s+\w+\s+Comdg\.?$/i.test(t) ||
    // Lewis & Clark sextant readings and numbered course-and-distance
    // topographic notes — measurements, not journal narrative.
    /^Took\s+equal\s+altit/i.test(t) ||
    // Paragraphs that are dominated by numbered "(1) ... (2) ..." course
    // notes (more than two of them and short overall — short admin form).
    (t.length < 600 && (t.match(/\(\d+\)/g) || []).length >= 2)
  );
}

function buildPassage(paras, startIdx) {
  // Pass 1: chunk paragraphs into blocks. Each block begins with a
  // bracketed [Editor, Date] paragraph and includes any subsequent
  // unbracketed paragraphs (which are continuations of that day's entry).
  // Paragraphs before the first bracket form a "leading" no-date block
  // and pass through (relevant when an anchor lands mid-narrative or in
  // a chapter-summary section).
  const blocks = [];
  let current = { date: null, paras: [] };
  for (let i = startIdx; i < paras.length; i++) {
    const raw = paras[i];
    if (isAdminFragment(raw)) continue;
    const date = paragraphEditorDate(raw);
    const cleanedForCheck = cleanParagraph(raw);
    const isChapter =
      cleanedForCheck && isChapterHeading(cleanedForCheck);
    // Astro/sextant tables are inset from the narrative and would
    // otherwise emit as flattened numeric noise. Treat as chapter-
    // break-equivalent: stop emission, don't span the table.
    const isTable = isObservationTable(raw);

    if (isChapter || isTable) {
      // Chapter break ends the current block and emits a marker block
      // that pass 3 uses to halt further emission. This keeps passages
      // from spanning chapters even in sources that don't use the
      // [Editor, Date] bracket convention (e.g. Scott, Amundsen).
      if (current.paras.length > 0) blocks.push(current);
      blocks.push({ date: null, paras: [], isChapterBreak: true });
      current = { date: null, paras: [] };
    } else if (date) {
      if (current.paras.length > 0) blocks.push(current);
      current = { date, paras: [raw] };
    } else {
      current.paras.push(raw);
    }
  }
  if (current.paras.length > 0) blocks.push(current);

  // Pass 2: pre-clean each block's paragraphs and measure surviving length.
  // Dedup uses post-filter content size because picking by raw length is
  // wrong when a block's bracket paragraph is itself a filtered short
  // fragment (e.g. a stray sextant-reading line) and the substantive
  // content lives entirely in the continuation paragraph(s).
  for (const block of blocks) {
    if (block.isChapterBreak) {
      block._cleaned = [];
      block._filteredLength = 0;
      continue;
    }
    block._cleaned = block.paras.map(cleanParagraph).filter(Boolean);
    block._filteredLength = block._cleaned.reduce(
      (s, c) => s + c.length,
      0,
    );
  }

  // Dedupe by date, keeping the block with the most surviving content.
  // No-date blocks pass through.
  const byDate = new Map();
  for (const block of blocks) {
    if (!block.date) continue;
    const prev = byDate.get(block.date);
    if (!prev || block._filteredLength > prev._filteredLength) {
      byDate.set(block.date, block);
    }
  }
  const finalBlocks = blocks.filter(
    (b) => !b.date || byDate.get(b.date) === b,
  );

  // Pass 3: emit pre-cleaned paragraphs, stopping at chapter break or
  // word/char limits.
  const out = [];
  let totalWords = 0;
  let totalChars = 0;
  let stop = false;
  for (const block of finalBlocks) {
    if (stop) break;
    if (block.isChapterBreak) {
      if (out.length > 0) {
        stop = true;
        break;
      }
      continue; // skip leading chapter break before any content
    }
    for (const cleaned of block._cleaned) {
      const wc = wordCount(cleaned);
      const newWords = totalWords + wc;
      const newChars = totalChars + cleaned.length + (out.length ? 2 : 0);
      if (out.length > 0 && (newWords > TARGET_WORDS_MAX || newChars > MAX_CHARS)) {
        stop = true;
        break;
      }
      out.push(cleaned);
      totalWords = newWords;
      totalChars = newChars;
      if (totalWords >= TARGET_WORDS_MIN && /[.!?]"?\s*$/.test(cleaned)) {
        if (totalWords >= TARGET_WORDS_MAX - 100) {
          stop = true;
          break;
        }
      }
    }
  }
  // Trim dangling content from the tail. Some narrative paragraphs end
  // with an introducer to a table the extractor has now skipped (e.g.
  // "On the 2d of September, I observed the" — the table that followed
  // was filtered as an observation table). Word/char limits can also
  // cut mid-letter, leaving the body ending on a salutation fragment
  // ("Your sincere friend,"). Walk paragraphs from the end, dropping any
  // that contain no sentence-ending punctuation, then trim a partial
  // dangling tail off the new last paragraph.
  while (out.length > 0 && !/[.!?]/.test(out[out.length - 1])) {
    out.pop();
  }
  if (out.length > 0) {
    const last = out[out.length - 1];
    if (!/[.!?]["”]?\s*$/.test(last)) {
      const trimmed = last.replace(/[^.!?]*$/, '').trimEnd();
      if (trimmed.length > 0) out[out.length - 1] = trimmed;
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
