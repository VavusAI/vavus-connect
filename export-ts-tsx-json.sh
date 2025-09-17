#!/usr/bin/env bash
set -euo pipefail

OUT="webapp-code-$(date +%Y%m%d-%H%M%S).txt"

# Optional small tree for context
{
  echo "===== PROJECT TREE (depth 4) ====="
  if command -v tree >/dev/null 2>&1; then
    tree -a -L 4 -I "node_modules|.git|.next|dist|build|coverage|.vercel|.turbo|.cache|.output|public/assets" .
  else
    find . -maxdepth 4 -type d \
      -not -path "./node_modules/*" \
      -not -path "./.git/*" \
      -not -path "./.next/*" \
      -not -path "./dist/*" \
      -not -path "./build/*" \
      -not -path "./coverage/*" \
      -not -path "./.vercel/*" \
      -not -path "./.turbo/*" \
      -not -path "./.cache/*" \
      -not -path "./.output/*" \
    | sed 's/[^-][^\/]*\//  /g;s/\/\([^\/]*\)$/- \1/'
  fi
  echo
  echo "===== FILES (.ts, .tsx, .json) ====="
} > "$OUT"

# Collect and dump files with headers + line numbers
find . \
  \( -path "./node_modules/*" -o -path "./.git/*" -o -path "./.next/*" -o -path "./dist/*" -o -path "./build/*" -o -path "./coverage/*" -o -path "./.vercel/*" -o -path "./.turbo/*" -o -path "./.cache/*" -o -path "./.output/*" -o -path "./public/assets/*" \) -prune -o \
  -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) -print0 \
| sort -z \
| while IFS= read -r -d '' f; do
    {
      echo
      echo "===== FILE: $f ====="
      if command -v nl >/dev/null 2>&1; then
        nl -ba "$f"
      else
        awk '{printf("%6d  %s\n", NR, $0)}' "$f"
      fi
    } >> "$OUT"
  done

echo "Wrote: $OUT"
