# Activity 3: set up the tools

You are an AI agent helping a person set up a private Wayfinding repository. Start with the capability check. Before **each** command, show the exact command and say what it changes; run it only after the person's OK. If they decline, stop that path. Never run `install.sh` for them as a batch: you may read it aloud, but run its steps one at a time. The tool does not add a remote or send the repository anywhere. Content sent to your AI service is subject to that service's terms.

## 1. Check what this environment can actually do

Probe rather than infer from your product name. Show each probe and get the person's OK before running it:

1. Can you run a command at all? Try `echo ok`. If yes, try `git --version` and `node --version`; Node must be version 22 or later. Stop installation if Git or the right Node is unavailable, and explain what's missing.
2. Ask which folder the person wants to use. With their OK, test a file **in that folder**: `printf 'ok\n' > "$WF_PROBE"`, then `cat "$WF_PROBE"`, then `rm "$WF_PROBE"`. Set `WF_PROBE` to an agreed new filename there. Check that the readback is `ok`. Ask if files in this environment survive after this conversation; if unsure, treat persistence as unknown and ask them to check. Cloud sandboxes often reset.
3. Check whether you can add an MCP server to your own client, without changing its configuration yet. If not, check whether you can run `node` commands directly from the shell. Do not claim an integration you have not tested.

Choose a path based on the findings:

- Shell, Git, Node 22+, writable persistent folder and MCP configuration: offer the full install and MCP connection below.
- Shell, Git, Node 22+, writable persistent folder, but no MCP configuration: install and use the CLI commands directly. Do not block on MCP.
- Commands work but files do not persist: explain that the repo will be lost when the session ends. Offer a temporary trial, or suggest moving to an agent running on the person's computer. Do not call the trial a durable installation.
- No command execution (plain chat): say that you cannot install this tool here. The person can still do activity 1 (their interview), activity 2 (interview a teammate) and activity 4 (prepare a lesson) in chat. Give them the resulting documents to save themselves.

If they need a different environment, offer these examples without ranking them: Claude Code (a terminal agent; check whether it can run local commands and keep files), OpenAI Codex CLI (a terminal agent; check its filesystem access), Cursor (an editor with an agent; check its command and MCP access), Claude Desktop (a desktop app with MCP support; check the available connection setup), and sandboxed agent modes in Claude or ChatGPT, such as Claude Cowork or ChatGPT agent/Work modes (check command access and whether files survive; persistence varies). Do not infer a product's capabilities from its name.

The check is done when the person understands which path is available and has chosen whether to continue.

## 2. Install the pinned source locally

Ask before using the tool folder `~/.wayfinding/tool`; check that it does not already contain someone else's files. Tell the person that `git clone` fetches the public source and `npm ci` downloads its dependencies. The commands pin the release tag `v0.1.0`; if the tag is unavailable, stop rather than switching to a moving branch. There is no script piped from the network into a shell.

Set `WF_TOOL="$HOME/.wayfinding/tool"`. Show and ask about **each** command in order:

```sh
git clone --branch v0.1.0 --depth 1 https://github.com/AI-Wayfinding/getting-started.git "$WF_TOOL"
cd "$WF_TOOL/tool"
npm ci
npm run build
```

For a person running the commands without an agent, `install.sh` offers the same steps with a separate confirmation for each. You may read it to the person. Run the commands above individually instead of running the script for them.

## 3. Create the person's repository

Ask whether this is for one **team** or one **individual**. A team gets one repository for that team, by default `~/Wayfinding-<team-slug>`; an individual gets one repository for that person, by default `~/Wayfinding`. Both use the same folders. Ask for the name, the exact repository path, and a name and email for this repository's Git commits. Ask before using the chosen path; start in an unused directory. The slug is the team's name in lowercase, with non-letters/digits replaced by hyphens. Set `WF_KIND` to `team` or `individual`, `WF_NAME` to the chosen name, `WF_REPO` to the agreed path, `WF_AUTHOR` and `WF_EMAIL` to the person's chosen commit identity. Do not set Git identity globally.

Show and ask about each of these commands separately. The preliminary `git init` lets the person set a **local** Git identity before the tool makes its first commit. `wayfinding init` also initializes Git itself when called on a fresh, empty directory; if identity is missing, it tells the person how to set it locally and retry.

```sh
mkdir -p "$WF_REPO"
git init -b main "$WF_REPO"
git -C "$WF_REPO" config user.name "$WF_AUTHOR"
git -C "$WF_REPO" config user.email "$WF_EMAIL"
node dist/cli.js init "$WF_REPO" --kind "$WF_KIND" --name "$WF_NAME"
```

Explain what was created: `positions/`, `interviews/`, `lessons/`, `resources/`, `.wayfinding/config.json`, `.wayfinding/index.json`, `README.md`, `.gitignore`, and the first local commit. The tool configures local Git notes for comments. It does not add a remote or push. Stop on an error; in particular, do not overwrite a non-empty unrelated folder.

## 4. Connect only with permission, or use the CLI

If MCP configuration is possible, ask which supported client the person uses (`claude-code`, `claude-desktop`, `cursor`, or `codex`). Set `WF_CLIENT` to that value. Show and run this command after their OK:

```sh
node dist/cli.js connect "$WF_CLIENT"
```

It **prints** a configuration example; it never writes to the client. Replace `<your-Wayfinding-repo>` with the agreed path in the displayed example. Show the finished configuration and ask again before applying it in their client. Check the client's actual MCP configuration format and test the connection. If you cannot configure MCP, use `node dist/cli.js <operation> --repo "$WF_REPO"` directly. CLI writes default to `authoredBy: human`; MCP writes default to `agent`. Specify `--authored-by mixed` or `authoredBy: mixed` for joint work. Do not describe your own writing as human-only.

## 5. Bring in the person's documents and try search and comments

Ask for the path to their saved first position (activity 1) and permission to copy it into the repo's ignored `.wayfinding/inbox/` folder. Import reads only files inside the repository, so copy an outside document into that folder first. Set `WF_POSITION` to its existing path and `WF_TITLE` to the title the person chooses. The tool gives the imported item a new ID, preserves its Markdown body, and commits the item and search index. Run each command after showing it and getting an OK:

```sh
mkdir -p "$WF_REPO/.wayfinding/inbox"
cp "$WF_POSITION" "$WF_REPO/.wayfinding/inbox/position.md"
node dist/cli.js import "$WF_REPO/.wayfinding/inbox/position.md" --type position --title "$WF_TITLE" --author "$WF_AUTHOR" --repo "$WF_REPO"
rm "$WF_REPO/.wayfinding/inbox/position.md"
```

Ask whether they have teammate interview write-ups, and whether each interviewee approved bringing their corrected extract into this repo. For each approved file, repeat the copy/import/remove pattern with a different inbox filename and `--type interview`. Leave unapproved material where it is. The same pattern works for lessons and resources; resources also need `--resource-kind prompt|howto|document|link`.

Set `WF_QUERY` to a word in the imported position. Run search and show the result. Copy the `id` and `path` from the import output into `WF_ITEM_ID` and `WF_ITEM_PATH`. Ask the person for `WF_COMMENT`, then show and run one command at a time:

```sh
node dist/cli.js search "$WF_QUERY" --repo "$WF_REPO"
node dist/cli.js comment "$WF_ITEM_ID" "$WF_COMMENT" --author "$WF_AUTHOR" --repo "$WF_REPO"
node dist/cli.js comments "$WF_ITEM_ID" --repo "$WF_REPO"
git -C "$WF_REPO" log --oneline
git -C "$WF_REPO" rev-parse "HEAD:$WF_ITEM_PATH"
git -C "$WF_REPO" notes --ref=wayfinding-comments show "$WF_BLOB"
```

Set `WF_BLOB` to the blob ID printed by `rev-parse` before the last command. Explain that a blob is the saved version of the item and that its Git note holds the comment. The `comments` command includes comments from earlier versions too. If the environment cannot run the tool, end with the recommendation and no-tool path from section 1 instead.

You are done when the person has a local repository containing their approved documents, can find one by search, can see a comment and the local history, and knows how to use their agent through MCP or the CLI. No remote or network sharing is part of this activity.
