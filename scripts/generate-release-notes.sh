#!/usr/bin/env bash
# Génère des notes de release groupées par type de commit (Conventional Commits), plutôt que
# la liste brute produite par `gh release create --generate-notes`. Utilisé par
# .github/workflows/release.yml ; utilisable en local pour prévisualiser :
#   ./scripts/generate-release-notes.sh v0.1.1
set -euo pipefail

CURRENT_TAG="${1:?Usage: generate-release-notes.sh <tag>}"
PREV_TAG=$(git describe --tags --abbrev=0 "${CURRENT_TAG}^" 2>/dev/null || true)

if [ -z "$PREV_TAG" ]; then
  RANGE="$CURRENT_TAG"
else
  RANGE="${PREV_TAG}..${CURRENT_TAG}"
fi

declare -A TITLES=(
  [feat]="✨ Fonctionnalités"
  [fix]="🐛 Corrections"
  [perf]="⚡ Performance"
  [refactor]="♻️ Refactoring"
  [docs]="📚 Documentation"
  [test]="✅ Tests"
  [ci]="⚙️ CI"
  [build]="🏗️ Build"
  [style]="🎨 Style"
  [chore]="🧹 Divers"
)
ORDER=(feat fix perf refactor docs test ci build style chore)
KNOWN_TYPES_RE="^($(IFS='|'; echo "${ORDER[*]}"))(\(.+\))?: "

echo "## Changements"
echo

for type in "${ORDER[@]}"; do
  commits=$(git log "$RANGE" --pretty=format:'%s' | grep -E "^${type}(\(.+\))?: " || true)
  if [ -n "$commits" ]; then
    echo "### ${TITLES[$type]}"
    echo "$commits" | sed -E "s/^${type}(\(.+\))?: /- /"
    echo
  fi
done

others=$(git log "$RANGE" --pretty=format:'%s' | grep -vE "$KNOWN_TYPES_RE" || true)
if [ -n "$others" ]; then
  echo "### Autres"
  echo "$others" | sed -E 's/^/- /'
  echo
fi

if [ -n "$PREV_TAG" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  echo "**Changelog complet** : https://github.com/${GITHUB_REPOSITORY}/compare/${PREV_TAG}...${CURRENT_TAG}"
fi
