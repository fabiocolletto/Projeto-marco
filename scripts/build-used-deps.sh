#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_root"

if [[ ! -f scripts/used-runtime-deps.txt ]]; then
  echo "scripts/used-runtime-deps.txt not found" >&2
  exit 1
fi

if [[ ! -f scripts/used-static-deps.json ]]; then
  echo "scripts/used-static-deps.json not found" >&2
  exit 1
fi

runtime_list=$(mktemp)
static_list=$(mktemp)
manuals_list=$(mktemp)
workflows_list=$(mktemp)
tests_list=$(mktemp)
extras_list=$(mktemp)

ojq=$(command -v jq || true)
if [[ -z "$ojq" ]]; then
  echo "jq is required to build the dependency manifest" >&2
  exit 1
fi

jq -r '.files[].path' scripts/used-static-deps.json | sed 's#^./##' | sort -u > "$static_list"
cat scripts/used-runtime-deps.txt | sed 's#^./##' | sort -u > "$runtime_list"

find manuals -type f -print | sed 's#^./##' | sort -u > "$manuals_list"
find .github/workflows -type f -print | sed 's#^./##' | sort -u > "$workflows_list"
find tests -type f -print | sed 's#^./##' | sort -u > "$tests_list"

cat <<'LIST' > "$extras_list"
README.md
agent.md
MARCO_BLUEPRINT.md
index.html
api/.gitkeep
api/README.md
.gitattributes
.gitignore
.markdown-link-check.json
package.json
package-lock.json
playwright.config.js
scripts/build-used-deps.sh
scripts/scan-static-deps.mjs
scripts/used-static-deps.json
scripts/used-runtime-deps.txt
scripts/used-deps.txt
LIST

if [[ -f scripts/all-files.txt ]]; then
  echo "scripts/all-files.txt" >> "$extras_list"
fi
if [[ -f scripts/candidates-archive.txt ]]; then
  echo "scripts/candidates-archive.txt" >> "$extras_list"
fi
if [[ -f appbase/i18n/en-US.json ]]; then
  echo "appbase/i18n/en-US.json" >> "$extras_list"
fi
if [[ -f appbase/i18n/es-ES.json ]]; then
  echo "appbase/i18n/es-ES.json" >> "$extras_list"
fi

cat \
  "$runtime_list" \
  "$static_list" \
  "$manuals_list" \
  "$workflows_list" \
  "$tests_list" \
  "$extras_list" \
  | sed 's#^./##' | sort -u
