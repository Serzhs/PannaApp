#!/usr/bin/env bash
# Stop hook: the whole workspace must typecheck before a turn is allowed to end.
# This is the rule that stops "I've made the changes" from meaning "it might compile".
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f package.json ] || exit 0
[ -d node_modules ] || exit 0
grep -q '"typecheck"' package.json || exit 0

out=$(pnpm typecheck 2>&1)
if [ $? -ne 0 ]; then
  echo "pnpm typecheck fails. The work is not finished; fix these errors:" >&2
  echo "$out" | tail -60 >&2
  exit 2
fi
exit 0
