#!/usr/bin/env bash
set -euo pipefail

OUT="webapp-code-$(date +%Y%m%d-%H%M%S).txt"

# Optional project tree (helps me navigate)
{
  echo "===== PROJECT TREE (max depth 4) ====="
  if command -v tree >/dev/null 2>&1; then
    tree -a -L 4 -I "node_modules|.git|.next|dist|build|coverage|.vercel|.turbo|.cache|.output" .
  else
    # fallback if 'tree' isn't installed
    find . -maxdepth 4 -type d | sed 's/[^-][^\/]*\//  /g;s/\/\([^\/]*\)$/- \1/'
  fi
  echo
} > "$OUT"

# File globs to include
INCLUDE='
*.ts
*.tsx
*.js
*.jsx
*.json
*.md
*.yaml
*.yml
*.css
*.scss
*.html
*.cjs
*.mjs
'

# Paths to exclude (common junk + secrets)
EXCLUDE_DIRS='
./node_modules
./.git
./.next
./dist
./build
./coverage
./.vercel
./.turbo
./.cache
./.output
./public/assets
'
EXCLUDE_FILES='
*.png
*.jpg
*.jpeg
*.gif
*.svg
*.webp
*.ico
*.map
*.lock
*.log
.env
.env.*
*.pem
*.key
*.crt
*.cert
'

# Build find predicates
inc_pred=()
while read -r p; do [[ -n "$p" ]] && inc_pred+=( -name "$p" -o ); done <<< "$INCLUDE"
# remove trailing -o
unset 'inc_pred[${#inc_pred[@]}-1]'

exc_pred_dirs=()
while read -r d; do [[ -n "$d" ]] && exc_pred_dirs+=( -path "$d" -prune -o ); done <<< "$EXCLUDE_DIRS"

exc_pred_files=()
while read -r f; do [[ -n "$f" ]] && exc_pred_files+=( -name "$f" -o ); done <<< "$EXCLUDE_FILES"
unset 'exc_pred_files[${#exc_pred_files[@]}-1]'

# Collect files, sort, and append with headers + line numbers
echo "===== FILES =====" >> "$OUT"
find . \( "${exc_pred_dirs[@]}" -false \) -type f \( "${inc_pred[@]}" \) ! \( "${exc_pred_files[@]}" \) \
  | LC_ALL=C sort \
  | while IFS= read -r file; do
      echo -e "\n\n===== FILE: $file =====" >> "$OUT"
      # show with line numbers for easy referencing
      if command -v nl >/dev/null 2>&1; then
        nl -ba "$file" >> "$OUT"
      else
        awk '{printf("%6d  %s\n", NR, $0)}' "$file" >> "$OUT"
      fi
    done

# Optional: split if the file is too big for upload (creates ~9MB chunks)
# Uncomment if needed:
# split -b 9m -d -a 2 "$OUT" "${OUT%.txt}-part-"

echo "Wrote: $OUT"
