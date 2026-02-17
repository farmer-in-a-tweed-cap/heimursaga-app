#!/usr/bin/env bash
# PreToolUse hook: Block destructive Prisma commands and scan migration SQL.
# Reads the tool input JSON from stdin (Claude Code hook protocol).
# Exit 0 = allow, exit 2 = block (with reason on stderr).

set -euo pipefail

# --- Read hook input from stdin ---
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")

# Only care about Bash tool invocations
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# --- Fast exit: not a Prisma-related command ---
if [[ "$COMMAND" != *prisma* && "$COMMAND" != *db:migrate* ]]; then
  exit 0
fi

# --- Hard-block: always-destructive commands ---
# prisma migrate reset
if echo "$COMMAND" | grep -qiE 'prisma\s+migrate\s+reset'; then
  echo "BLOCKED: 'prisma migrate reset' wipes the entire database. This command has destroyed production data before. Use 'prisma migrate dev' for safe schema changes." >&2
  exit 2
fi

# prisma db push --force-reset
if echo "$COMMAND" | grep -qiE 'prisma\s+db\s+push\s.*--force-reset|prisma\s+db\s+push\s+--force-reset'; then
  echo "BLOCKED: 'prisma db push --force-reset' drops all tables and recreates the database. Use 'prisma migrate dev' to apply incremental changes safely." >&2
  exit 2
fi

# prisma db push --accept-data-loss
if echo "$COMMAND" | grep -qiE 'prisma\s+db\s+push\s.*--accept-data-loss|prisma\s+db\s+push\s+--accept-data-loss'; then
  echo "BLOCKED: 'prisma db push --accept-data-loss' allows destructive schema changes that can delete data. Create a proper migration with 'prisma migrate dev' instead." >&2
  exit 2
fi

# prisma db execute (raw SQL bypasses migration tracking)
if echo "$COMMAND" | grep -qiE 'prisma\s+db\s+execute'; then
  echo "BLOCKED: 'prisma db execute' runs raw SQL outside the migration system. Use 'prisma migrate dev' to create tracked migrations instead." >&2
  exit 2
fi

# --- Allow safe Prisma commands ---
if echo "$COMMAND" | grep -qiE 'prisma\s+(generate|studio|format|validate|version|init|db\s+seed|db\s+pull)'; then
  exit 0
fi

# --- Scan migration SQL for prisma migrate dev/deploy and db:migrate ---
if echo "$COMMAND" | grep -qiE 'prisma\s+migrate\s+(dev|deploy)|db:migrate'; then
  # Find the most recent migration directory
  PRISMA_DIR="$(pwd)/apps/api/prisma/migrations"
  if [[ ! -d "$PRISMA_DIR" ]]; then
    # Try to find it relative to the repo root
    REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
    if [[ -n "$REPO_ROOT" ]]; then
      PRISMA_DIR="$REPO_ROOT/apps/api/prisma/migrations"
    fi
  fi

  if [[ -d "$PRISMA_DIR" ]]; then
    # Get the most recent migration SQL file (sorted by directory name = timestamp)
    LATEST_SQL=$(find "$PRISMA_DIR" -name "migration.sql" -type f | sort | tail -1)

    if [[ -n "$LATEST_SQL" && -f "$LATEST_SQL" ]]; then
      FINDINGS=""

      # Check for destructive SQL patterns (case-insensitive)
      if grep -qiE 'DROP\s+TABLE' "$LATEST_SQL"; then
        FINDINGS="${FINDINGS}\n  - DROP TABLE detected"
      fi
      if grep -qiE 'DROP\s+COLUMN' "$LATEST_SQL"; then
        FINDINGS="${FINDINGS}\n  - DROP COLUMN detected"
      fi
      if grep -qiE 'ALTER\s+TABLE\s+.*\s+DROP' "$LATEST_SQL"; then
        FINDINGS="${FINDINGS}\n  - ALTER TABLE ... DROP detected"
      fi
      if grep -qiE '\bTRUNCATE\b' "$LATEST_SQL"; then
        FINDINGS="${FINDINGS}\n  - TRUNCATE detected"
      fi
      if grep -qiE '\bDELETE\s+FROM\b' "$LATEST_SQL"; then
        FINDINGS="${FINDINGS}\n  - DELETE FROM detected"
      fi

      if [[ -n "$FINDINGS" ]]; then
        MIGRATION_NAME=$(basename "$(dirname "$LATEST_SQL")")
        echo "BLOCKED: Destructive SQL detected in migration '$MIGRATION_NAME':" >&2
        echo -e "$FINDINGS" >&2
        echo "" >&2
        echo "Review the migration at: $LATEST_SQL" >&2
        echo "If this is intentional, use the /migration-reviewer agent for a full safety analysis." >&2
        exit 2
      fi
    fi
  fi
fi

# --- Default: allow ---
exit 0
