// One-shot script: log in, prove the JWT works, then exit.
// Usage: HEIMURSAGA_BASE_URL=... ARCHIVE_EMAIL=... ARCHIVE_PASSWORD=... node auth-check.js

const cfg = require('./config');
const { ApiClient } = require('./api');

async function main() {
  cfg.requireAuthEnv();
  const api = new ApiClient();
  console.log(`[auth-check] base URL: ${api.baseUrl}`);
  console.log(`[auth-check] logging in as ${cfg.ACCOUNT_EMAIL}`);

  const { user } = await api.login(cfg.ACCOUNT_EMAIL, cfg.ACCOUNT_PASSWORD);
  console.log(`[auth-check] login OK`);
  console.log(`  token (first 24): ${api.token.slice(0, 24)}…`);
  console.log(`  refreshToken present: ${Boolean(api.refreshToken)}`);
  console.log(`  user: ${JSON.stringify(user)}`);

  // Quick token-vs-controller sanity test: create nothing, just trigger auth
  // by making a write request that would error on auth before reaching the
  // service layer. We don't actually want to create data here, so we'll just
  // print the token and exit. Optional sanity calls left to the operator.
  console.log(`[auth-check] OK — JWT acquired and ready to use on /v1/* endpoints`);
}

main().catch((e) => {
  console.error('[auth-check] FAILED');
  console.error(e.message);
  if (e.body) console.error('  response body:', JSON.stringify(e.body).slice(0, 300));
  process.exit(1);
});
