#!/usr/bin/env bash
set -euo pipefail

# Show each command and run it only after the person's confirmation.
step() {
  printf '\nCommand:'
  printf ' %q' "$@"
  printf '\nRun it? [y/N] '
  local answer
  read -r answer
  [[ "$answer" == y || "$answer" == Y ]] || { printf 'Stopped.\n'; exit 1; }
  "$@"
}
ask() {
  local label="$1" default="$2" answer
  printf '%s [%s]: ' "$label" "$default" >&2
  read -r answer
  printf '%s' "${answer:-$default}"
}

WF_TOOL="$HOME/.wayfinding/tool"
printf 'This downloads v0.1.0 and builds it locally. Choose the repository folder next.\n'
WF_KIND=$(ask 'Team or individual? (team/individual)' individual)
[[ "$WF_KIND" == team || "$WF_KIND" == individual ]] || { printf 'Choose team or individual.\n' >&2; exit 1; }
WF_NAME=$(ask 'Name of the team or person' 'My Wayfinding')
WF_SLUG=$(printf '%s' "$WF_NAME" | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')
[[ -n "$WF_SLUG" ]] || { printf 'Name needs a letter or number for a team folder.\n' >&2; exit 1; }
if [[ "$WF_KIND" == team ]]; then WF_DEFAULT="$HOME/Wayfinding-$WF_SLUG"; else WF_DEFAULT="$HOME/Wayfinding"; fi
WF_REPO=$(ask 'Where should the private repository live?' "$WF_DEFAULT")
WF_AUTHOR=$(ask 'Name for commits in this repository' "$WF_NAME")
WF_EMAIL=$(ask 'Email for commits in this repository' 'you@example.com')
[[ "$WF_EMAIL" != 'you@example.com' ]] || { printf 'Enter your real commit email.\n' >&2; exit 1; }
WF_CLIENT=$(ask 'MCP client (claude-code/claude-desktop/cursor/codex), or none' none)
[[ ! -e "$WF_TOOL" ]] || { printf 'The tool folder already exists; inspect it before installing.\n' >&2; exit 1; }
[[ ! -e "$WF_REPO" ]] || { printf 'Choose an unused repository folder; setup will not overwrite it.\n' >&2; exit 1; }

step git clone --branch v0.1.0 --depth 1 https://github.com/AI-Wayfinding/getting-started.git "$WF_TOOL"
step cd "$WF_TOOL/tool"
step npm ci
step npm run build
step mkdir -p "$WF_REPO"
step git init -b main "$WF_REPO"
step git -C "$WF_REPO" config user.name "$WF_AUTHOR"
step git -C "$WF_REPO" config user.email "$WF_EMAIL"
step node dist/cli.js init "$WF_REPO" --kind "$WF_KIND" --name "$WF_NAME"
if [[ "$WF_CLIENT" != none ]]; then
  step node dist/cli.js connect "$WF_CLIENT"
  printf 'This only prints a connection example. Add it to your agent yourself after reviewing it.\n'
fi

printf '\nTo bring in your saved first position, give the path to its Markdown file.\n'
WF_POSITION=$(ask 'Saved first position file (empty to stop)' '')
if [[ -z "$WF_POSITION" ]]; then printf 'Setup is complete; import later using instructions/install.md.\n'; exit 0; fi
[[ -f "$WF_POSITION" ]] || { printf 'File not found.\n' >&2; exit 1; }
step mkdir -p "$WF_REPO/.wayfinding/inbox"
step cp "$WF_POSITION" "$WF_REPO/.wayfinding/inbox/position.md"
WF_TITLE=$(ask 'Title for this position' 'My first position')
step node dist/cli.js import "$WF_REPO/.wayfinding/inbox/position.md" --type position --title "$WF_TITLE" --author "$WF_AUTHOR" --repo "$WF_REPO"
step rm "$WF_REPO/.wayfinding/inbox/position.md"
printf 'The import above showed its id and path. Copy those values for the next checks.\n'
WF_QUERY=$(ask 'Word to search for in your position' 'position')
step node dist/cli.js search "$WF_QUERY" --repo "$WF_REPO"
WF_ITEM_ID=$(ask 'Imported item id (26 characters)' '')
WF_ITEM_PATH=$(ask 'Imported item path (for example positions/my-first-position.md)' '')
[[ -n "$WF_ITEM_ID" && -n "$WF_ITEM_PATH" ]] || { printf 'Missing item id or path.\n' >&2; exit 1; }
WF_COMMENT=$(ask 'Comment to attach' 'First review')
step node dist/cli.js comment "$WF_ITEM_ID" "$WF_COMMENT" --author "$WF_AUTHOR" --repo "$WF_REPO"
step node dist/cli.js comments "$WF_ITEM_ID" --repo "$WF_REPO"
step git -C "$WF_REPO" log --oneline
step git -C "$WF_REPO" rev-parse "HEAD:$WF_ITEM_PATH"
WF_BLOB=$(ask 'Paste the blob id printed above' '')
[[ -n "$WF_BLOB" ]] || { printf 'Missing blob id.\n' >&2; exit 1; }
step git -C "$WF_REPO" notes --ref=wayfinding-comments show "$WF_BLOB"
printf 'Your repo, search and comment are ready. Nothing was pushed.\n'
