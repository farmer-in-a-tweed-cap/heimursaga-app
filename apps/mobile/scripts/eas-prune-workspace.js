#!/usr/bin/env node
// Runs before EAS's `pnpm install --frozen-lockfile` at the monorepo root.
// Combined with .easignore, this prunes the workspace down to just what
// the mobile app needs: apps/mobile + packages/types + packages/tsconfig.
// We rewrite pnpm-workspace.yaml and regenerate the lockfile so that the
// subsequent `pnpm install --frozen-lockfile` has a consistent view.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const workspaceYaml = path.join(repoRoot, 'pnpm-workspace.yaml');

const mobileOnlyWorkspace = [
  'packages:',
  '  - "apps/mobile"',
  '  - "packages/types"',
  '  - "packages/tsconfig"',
  '',
].join('\n');

fs.writeFileSync(workspaceYaml, mobileOnlyWorkspace);
console.log('[eas-pre-install] rewrote pnpm-workspace.yaml to mobile-only');

execSync('pnpm install --lockfile-only --no-frozen-lockfile', {
  cwd: repoRoot,
  stdio: 'inherit',
});
console.log('[eas-pre-install] regenerated lockfile for pruned workspace');
