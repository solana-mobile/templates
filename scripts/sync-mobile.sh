#!/usr/bin/env bash
# Mirror mobile/ into solana-foundation/templates as a pull request (see docs/adr/0001-mobile-sync-is-authoritative.md).
# Usage: scripts/sync-mobile.sh [--ref <ref>] [--push]
set -euo pipefail

BRANCH=beeman/sync-mobile
FOUNDATION_REPO=solana-foundation/templates
PUSH=false
REF=origin/main
SOURCE_REPO=solana-mobile/templates

while [[ $# -gt 0 ]]; do
  case $1 in
    --push) PUSH=true ;;
    --ref)
      REF=${2:?--ref needs a value}
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
  shift
done

SOURCE_DIR=$(git rev-parse --show-toplevel)
if [[ $REF == origin/main ]]; then
  git -C "$SOURCE_DIR" fetch --quiet origin main
fi
SHA=$(git -C "$SOURCE_DIR" rev-parse "$REF^{commit}")
SHORT_SHA=${SHA:0:7}
WORK_DIR=$(mktemp -d)
BODY_FILE="$WORK_DIR.md"
# A successful dry run clears this trap so the clone stays around for inspection.
trap 'rm -rf "$WORK_DIR" "$BODY_FILE"' EXIT

pr_state() { gh pr view "$BRANCH" --repo "$FOUNDATION_REPO" --json state --jq .state 2>/dev/null || true; }

echo "Syncing $SOURCE_REPO@$SHORT_SHA mobile/ into $FOUNDATION_REPO ($WORK_DIR)"
gh repo clone "$FOUNDATION_REPO" "$WORK_DIR" -- --depth 1 --quiet
cd "$WORK_DIR"
git checkout --quiet -B "$BRANCH"

BEFORE=$(ls mobile)
git rm -r --quiet mobile
git -C "$SOURCE_DIR" archive "$SHA" mobile | tar -x -C "$WORK_DIR"
AFTER=$(ls mobile)

pnpm install --frozen-lockfile --silent --filter @solana-foundation/templates
pnpm --silent generate

git add --all --force mobile
git add .github/workflows/templates.json TEMPLATES.md templates.json
if git diff --cached --quiet; then
  echo "No changes: $FOUNDATION_REPO mobile/ already matches $SOURCE_REPO@$SHORT_SHA"
  if [[ $PUSH == true && $(pr_state) == OPEN ]]; then
    gh pr close "$BRANCH" --repo "$FOUNDATION_REPO" --comment "Closing: \`mobile/\` already matches $SOURCE_REPO@$SHORT_SHA."
  fi
  exit 0
fi

code_list() { sed 's/.*/`&`/' | paste -sd, - | sed 's/,/, /g'; }
ADDED=$(comm -13 <(echo "$BEFORE") <(echo "$AFTER") | code_list)
REMOVED=$(comm -23 <(echo "$BEFORE") <(echo "$AFTER") | code_list)
TITLE="chore(mobile): sync from $SOURCE_REPO@$SHORT_SHA"
{
  echo '## Summary'
  echo
  echo "Mirror \`mobile/\` from [\`$SOURCE_REPO@$SHORT_SHA\`](https://github.com/$SOURCE_REPO/commit/$SHA) and regenerate the template metadata."
  if [[ -n $ADDED || -n $REMOVED ]]; then
    echo
    echo '## Changes'
    echo
    [[ -z $ADDED ]] || echo "- Added: $ADDED"
    [[ -z $REMOVED ]] || echo "- Removed: $REMOVED"
  fi
} >"$BODY_FILE"

git commit --quiet --cleanup=verbatim -F <(echo "$TITLE" && echo && cat "$BODY_FILE")
git log -1 --format=%B
git --no-pager show --stat --format= HEAD | tail -n 1

if [[ $PUSH == false ]]; then
  trap - EXIT
  echo "Dry run: inspect $WORK_DIR, or rerun with --push to open the pull request"
  exit 0
fi

PR_STATE=$(pr_state)
if [[ $PR_STATE == OPEN ]] && git fetch --quiet --depth 1 origin "$BRANCH" 2>/dev/null &&
  [[ $(git rev-parse 'HEAD^{tree}') == $(git rev-parse 'FETCH_HEAD^{tree}') ]]; then
  echo "No changes: the open pull request already holds this sync"
  exit 0
fi

git push --force --quiet origin "$BRANCH"
if [[ $PR_STATE == OPEN ]]; then
  gh pr edit "$BRANCH" --repo "$FOUNDATION_REPO" --title "$TITLE" --body-file "$BODY_FILE"
else
  gh pr create --repo "$FOUNDATION_REPO" --base main --head "$BRANCH" --title "$TITLE" --body-file "$BODY_FILE"
fi
