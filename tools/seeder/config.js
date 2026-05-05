const fs = require('fs');
const path = require('path');

// Tiny zero-dependency .env loader. Looks for tools/seeder/.env and merges
// any KEY=VALUE pairs into process.env (existing env vars win).
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

const isCommand = (cmd) => process.argv.slice(2).includes(cmd);

module.exports = {
  BASE_URL: process.env.HEIMURSAGA_BASE_URL || 'http://localhost:5000',
  API_PREFIX: '/v1',

  RATE_LIMIT_MS: 600,
  BATCH_PAUSE_EVERY: 18,
  BATCH_PAUSE_MS: 11000,

  DRY_RUN: process.env.DRY_RUN === 'true' || isCommand('--dry-run'),
  STOP_ON_ERROR: true,

  MIN_WORD_COUNT: 200,
  MAX_WORD_COUNT: 1500,
  MAX_CONTENT_CHARS: 10000,
  MAX_DESCRIPTION_CHARS: 500,
  MAX_TITLE_CHARS_EXPEDITION: 100,
  MAX_TITLE_CHARS_ENTRY: 75,
  MAX_PLACE_CHARS: 250,

  ACCOUNT_EMAIL: process.env.ARCHIVE_EMAIL,
  ACCOUNT_PASSWORD: process.env.ARCHIVE_PASSWORD,

  ARCHIVE_FILE: path.join(__dirname, 'archive.json'),
  STATE_FILE: path.join(__dirname, 'seed-state.json'),

  requireAuthEnv() {
    required('ARCHIVE_EMAIL');
    required('ARCHIVE_PASSWORD');
    required('HEIMURSAGA_BASE_URL');
  },
};
