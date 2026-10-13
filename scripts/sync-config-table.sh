#!/usr/bin/env bash
# Keeps the "Key Config Files" table in CLAUDE.md in sync with the filesystem.
# - Removes rows for files that no longer exist
# - Appends rows for new config files with a placeholder description
# - Excludes gitignored files (they are per-machine, not part of the committed state)
# Preserves all existing hand-written descriptions.
# Invoked automatically by the pre-commit hook.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_MD="$ROOT/CLAUDE.md"

if [[ ! -f "$CLAUDE_MD" ]]; then
  echo "sync-config-table: CLAUDE.md not found, skipping"
  exit 0
fi

config_files=()

# Root-level config files (by extension)
while IFS= read -r -d '' f; do
  name="$(basename "$f")"
  case "$name" in
    package-lock.json|README.md|CHANGELOG.md|AGENTS.md|CLAUDE.md|LICENSE) continue ;;
  esac
  config_files+=("$name")
done < <(find "$ROOT" -maxdepth 1 -type f \( -name '*.json' -o -name '*.js' -o -name '*.ts' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' \) -print0 2>/dev/null | sort -z)

# Root-level dotfiles
for dotfile in .gitignore .npmignore .prettierignore .prettierrc.json .editorconfig .nvmrc .node-version .vale.ini .markdownlint.json .markdownlint.yaml .markdownlint.yml .vscodeignore .claudeignore; do
  [[ -f "$ROOT/$dotfile" ]] && config_files+=("$dotfile")
done

# Root-level named config files
if [[ -f "$ROOT/DESIGN.md" ]]; then
  config_files+=("DESIGN.md")
fi

# .claude/ direct children
if [[ -d "$ROOT/.claude" ]]; then
  while IFS= read -r -d '' f; do
    config_files+=(".claude/$(basename "$f")")
  done < <(find "$ROOT/.claude" -maxdepth 1 -type f -print0 2>/dev/null | sort -z)
fi

# .claude/skills/
if [[ -d "$ROOT/.claude/skills" ]]; then
  while IFS= read -r -d '' f; do
    relpath="${f#$ROOT/}"
    config_files+=("$relpath")
  done < <(find "$ROOT/.claude/skills" -maxdepth 2 -name 'SKILL.md' -type f -print0 2>/dev/null | sort -z)
fi

# context/
if [[ -d "$ROOT/context" ]]; then
  while IFS= read -r -d '' f; do
    relpath="${f#$ROOT/}"
    config_files+=("$relpath")
  done < <(find "$ROOT/context" -maxdepth 2 -type f -name '*.md' -print0 2>/dev/null | sort -z)
fi

# .github/workflows/
if [[ -d "$ROOT/.github/workflows" ]]; then
  while IFS= read -r -d '' f; do
    config_files+=(".github/workflows/$(basename "$f")")
  done < <(find "$ROOT/.github/workflows" -maxdepth 1 -type f -print0 2>/dev/null | sort -z)
fi

# scripts/ and .githooks/ — config-adjacent infrastructure worth surfacing
if [[ -d "$ROOT/scripts" ]]; then
  while IFS= read -r -d '' f; do
    relpath="${f#$ROOT/}"
    config_files+=("$relpath")
  done < <(find "$ROOT/scripts" -maxdepth 1 -type f -print0 2>/dev/null | sort -z)
fi

if [[ -d "$ROOT/.githooks" ]]; then
  while IFS= read -r -d '' f; do
    config_files+=(".githooks/$(basename "$f")")
  done < <(find "$ROOT/.githooks" -maxdepth 1 -type f -print0 2>/dev/null | sort -z)
fi

# Filter out gitignored files
filtered_files=()
cd "$ROOT"
for file in "${config_files[@]}"; do
  if ! git check-ignore -q "$file" 2>/dev/null; then
    filtered_files+=("$file")
  fi
done
config_files=("${filtered_files[@]}")

# Sort and deduplicate
mapfile -t sorted_files < <(printf '%s\n' "${config_files[@]}" | sort -u)

# Parse existing descriptions
declare -A descriptions
section_found=false
while IFS= read -r line; do
  if [[ "$line" == *"## Key Config Files"* ]]; then
    section_found=true
    continue
  fi
  if $section_found; then
    if [[ "$line" =~ ^\|[[:space:]]*\`([^\`]+)\`[[:space:]]*\|[[:space:]]*(.+)[[:space:]]*\| ]]; then
      file="${BASH_REMATCH[1]}"
      desc="${BASH_REMATCH[2]}"
      [[ "$file" == "File" ]] && continue
      # Strip trailing whitespace from the captured description.
      desc="${desc%"${desc##*[![:space:]]}"}"
      descriptions["$file"]="$desc"
    fi
  fi
done < "$CLAUDE_MD"

# Build new table
new_table="| File | Purpose |
|------|---------|"

for file in "${sorted_files[@]}"; do
  desc="${descriptions[$file]:-TODO: add description}"
  new_table+=$'\n'"| \`$file\` | $desc |"
done

# Replace the table in CLAUDE.md
tmpfile="$(mktemp)"
in_section=false
table_replaced=false

while IFS= read -r line; do
  if [[ "$line" == *"## Key Config Files"* ]]; then
    in_section=true
    echo "$line" >> "$tmpfile"
    continue
  fi

  if $in_section && ! $table_replaced; then
    if [[ "$line" == "" ]] || [[ "$line" == "|"* ]]; then
      continue
    fi
    echo "" >> "$tmpfile"
    echo "$new_table" >> "$tmpfile"
    echo "" >> "$tmpfile"
    echo "$line" >> "$tmpfile"
    table_replaced=true
    in_section=false
    continue
  fi

  echo "$line" >> "$tmpfile"
done < "$CLAUDE_MD"

if $in_section && ! $table_replaced; then
  echo "" >> "$tmpfile"
  echo "$new_table" >> "$tmpfile"
fi

# Normalize both sides through Prettier (when available) before comparing — so
# the script doesn't fight Prettier's column-aligned tables and report spurious
# updates on every commit.
if [[ -x "$ROOT/node_modules/.bin/prettier" ]]; then
  "$ROOT/node_modules/.bin/prettier" --write --log-level=warn "$tmpfile" --parser markdown >/dev/null 2>&1 || true
fi

if diff -q "$CLAUDE_MD" "$tmpfile" > /dev/null 2>&1; then
  echo "sync-config-table: no changes"
  rm "$tmpfile"
else
  mv "$tmpfile" "$CLAUDE_MD"
  echo "sync-config-table: updated CLAUDE.md"
  git add CLAUDE.md
fi
