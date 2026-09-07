#!/usr/bin/env bash
# PostToolUse hook: format and lint the single file that was just written.
# Silent no-op until the workspace exists, so it is harmless before 0001 lands.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f package.json ] || exit 0
[ -d node_modules ] || exit 0

file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -n "$file" ] || exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

npx --no-install prettier --write "$file" >/dev/null 2>&1

case "$file" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

out=$(npx --no-install eslint --max-warnings 0 "$file" 2>&1)
if [ $? -ne 0 ]; then
  # Exit 2 sends stderr back to Claude as feedback rather than to the user.
  echo "ESLint failed on $file. Fix these before continuing:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
