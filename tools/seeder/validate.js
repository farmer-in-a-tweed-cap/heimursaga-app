const fs = require('fs');
const cfg = require('./config');
const {
  PLACEHOLDER,
  isPlaceholder,
  wordCount,
  smartTruncate,
  derivePlace,
  isValidISODate,
  formatTitle,
} = require('./transform');

function loadArchive() {
  const raw = fs.readFileSync(cfg.ARCHIVE_FILE, 'utf-8');
  return JSON.parse(raw);
}

function validateExpedition(item, idx) {
  const errors = [];
  const warnings = [];
  const exp = item.expedition;
  const tag = `[expeditions[${idx}]]`;
  const label = exp?.title ? `[${exp.title}]` : tag;

  if (!exp) {
    errors.push(`${tag} missing 'expedition' object`);
    return { errors, warnings, label, exp: null, entries: [] };
  }

  if (exp.public_domain !== true)
    errors.push(`${label} public_domain must be true`);

  const rawTitle = (exp.title || '').trim();
  const finalTitle = formatTitle(exp.explorer, rawTitle);
  if (!rawTitle) errors.push(`${label} title is empty`);
  else if (finalTitle.length > cfg.MAX_TITLE_CHARS_EXPEDITION)
    errors.push(
      `${label} prefixed title "${finalTitle}" exceeds ${cfg.MAX_TITLE_CHARS_EXPEDITION} chars (${finalTitle.length})`,
    );

  const desc = (exp.description || '').trim();
  if (!desc) errors.push(`${label} description is empty`);
  else if (desc.length > cfg.MAX_DESCRIPTION_CHARS) {
    const truncated = smartTruncate(desc, cfg.MAX_DESCRIPTION_CHARS);
    warnings.push(
      `${label} description ${desc.length} chars exceeds ${cfg.MAX_DESCRIPTION_CHARS}; will auto-truncate to ${truncated.length}`,
    );
  }

  if (!isValidISODate(exp.start_date))
    errors.push(`${label} start_date invalid: ${exp.start_date}`);
  if (!isValidISODate(exp.end_date))
    errors.push(`${label} end_date invalid: ${exp.end_date}`);

  if (
    isValidISODate(exp.start_date) &&
    isValidISODate(exp.end_date) &&
    new Date(exp.end_date) <= new Date(exp.start_date)
  ) {
    errors.push(
      `${label} end_date (${exp.end_date}) is not after start_date (${exp.start_date})`,
    );
  }

  const entries = Array.isArray(item.entries) ? item.entries : [];
  if (entries.length === 0)
    errors.push(`${label} has no entries`);

  return { errors, warnings, label, exp, entries };
}

function validateEntry(entry, exp, label, idx) {
  const errors = [];
  const warnings = [];
  let skip = false;
  const eLabel = `${label} entry[${idx}] "${entry?.title || '<no title>'}"`;

  const rawTitle = (entry.title || '').trim();
  const finalTitle = formatTitle(exp.explorer, rawTitle);
  if (!rawTitle) errors.push(`${eLabel} title is empty`);
  else if (finalTitle.length > cfg.MAX_TITLE_CHARS_ENTRY)
    errors.push(
      `${eLabel} prefixed title "${finalTitle}" exceeds ${cfg.MAX_TITLE_CHARS_ENTRY} chars (${finalTitle.length})`,
    );

  if (!isValidISODate(entry.date))
    errors.push(`${eLabel} date invalid: ${entry.date}`);

  if (
    isValidISODate(entry.date) &&
    isValidISODate(exp.start_date) &&
    isValidISODate(exp.end_date)
  ) {
    const d = new Date(entry.date).getTime();
    const start = new Date(exp.start_date).getTime();
    const end = new Date(exp.end_date).getTime();
    if (d < start || d > end)
      errors.push(
        `${eLabel} date ${entry.date} is outside expedition range [${exp.start_date}, ${exp.end_date}]`,
      );
  }

  const lat = entry.coordinates?.lat;
  const lng = entry.coordinates?.lng;
  if (typeof lat !== 'number' || lat < -90 || lat > 90)
    errors.push(`${eLabel} coordinates.lat invalid: ${lat}`);
  if (typeof lng !== 'number' || lng < -180 || lng > 180)
    errors.push(`${eLabel} coordinates.lng invalid: ${lng}`);

  const body = entry.body || '';
  if (!body.trim()) errors.push(`${eLabel} body is empty`);

  // PLACEHOLDER → skip, not an error
  if (isPlaceholder(body)) {
    warnings.push(`${eLabel} body is PLACEHOLDER — will be skipped on live run`);
    skip = true;
  } else {
    if (body.length > cfg.MAX_CONTENT_CHARS)
      errors.push(
        `${eLabel} body ${body.length} chars exceeds API limit ${cfg.MAX_CONTENT_CHARS}`,
      );

    const wc = wordCount(body);
    if (wc < cfg.MIN_WORD_COUNT || wc > cfg.MAX_WORD_COUNT)
      warnings.push(
        `${eLabel} word count ${wc} outside [${cfg.MIN_WORD_COUNT}, ${cfg.MAX_WORD_COUNT}]`,
      );

    if (entry.word_count != null && typeof entry.word_count === 'number') {
      const declared = entry.word_count;
      const diff = Math.abs(wc - declared) / Math.max(declared, 1);
      if (diff > 0.1)
        warnings.push(
          `${eLabel} actual word count ${wc} differs >10% from declared ${declared}`,
        );
    }
  }

  // Place derivation: should always succeed thanks to fallback
  const place = derivePlace(entry, exp);
  if (!place || place.length === 0)
    errors.push(`${eLabel} could not derive 'place'`);

  return { errors, warnings, skip };
}

function run() {
  const archive = loadArchive();
  const items = archive.expeditions || [];

  let totalEntries = 0;
  let skippedEntries = 0;
  let validExpeditions = 0;
  const allErrors = [];
  const allWarnings = [];

  for (let i = 0; i < items.length; i++) {
    const expResult = validateExpedition(items[i], i);
    allErrors.push(...expResult.errors);
    allWarnings.push(...expResult.warnings);
    if (expResult.errors.length === 0) validExpeditions++;

    if (!expResult.exp) continue;

    for (let j = 0; j < expResult.entries.length; j++) {
      totalEntries++;
      const er = validateEntry(
        expResult.entries[j],
        expResult.exp,
        expResult.label,
        j,
      );
      allErrors.push(...er.errors);
      allWarnings.push(...er.warnings);
      if (er.skip) skippedEntries++;
    }
  }

  const readyEntries = totalEntries - skippedEntries;

  console.log('=== VALIDATION REPORT ===');
  console.log(
    `Expeditions: ${items.length} total, ${validExpeditions} valid`,
  );
  console.log(
    `Entries: ${totalEntries} total, ${readyEntries} ready to post, ${skippedEntries} skipped (PLACEHOLDER bodies)`,
  );
  console.log('');

  if (allWarnings.length > 0) {
    console.log(`WARNINGS (${allWarnings.length}):`);
    for (const w of allWarnings) console.log(`  ${w}`);
    console.log('');
  }

  if (allErrors.length > 0) {
    console.log(`ERRORS (${allErrors.length}) — will abort:`);
    for (const e of allErrors) console.log(`  ${e}`);
    console.log('');
  } else {
    console.log('ERRORS: none');
    console.log('');
  }

  if (totalEntries > 0 && skippedEntries === totalEntries) {
    console.log(
      `NOTE: every entry has a PLACEHOLDER body. A live run would create ${items.length} expeditions and post 0 entries.`,
    );
    console.log(
      'Fill in entry bodies in archive.json before running with DRY_RUN=false to land actual content.',
    );
    console.log('');
  }

  console.log(
    `Ready to post: ${readyEntries} entries across ${validExpeditions} expeditions`,
  );

  return {
    ok: allErrors.length === 0,
    summary: {
      expeditions: items.length,
      validExpeditions,
      totalEntries,
      readyEntries,
      skippedEntries,
      errors: allErrors.length,
      warnings: allWarnings.length,
    },
  };
}

if (require.main === module) {
  const { ok } = run();
  process.exit(ok ? 0 : 1);
}

module.exports = { run };
