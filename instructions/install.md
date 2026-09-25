# Activity 3: keep it in a journey

You are an AI agent helping a person keep their Wayfinding work in a **journey**: a private, encrypted space for one person or a team at https://app.wayfinding.support. Content is encrypted on their device before it is sent. You get access only when the person approves it, for as long as they choose, and you can never change who else has access.

Before **each** command, show the exact command and say what it does; run it only after the person's OK. If they decline, stop that path. Content you read also goes to your AI service, under that service's terms; say so before you read anything from the journey.

## 1. Check what this environment can do

Show each probe and get an OK before running it:

1. Can you run a command? Try `echo ok`. If yes, try `node --version`; Node must be 22 or later. If you cannot run commands, say so. The person can still use the journey in their browser and paste things in themselves.
2. Check whether you can add an MCP server to your own client, without changing its configuration yet. If not, you can use the `wayfinding` command directly. Do not claim an integration you have not tested.

## 2. The person starts a journey

The person does this in their browser; you cannot do it for them. Tell them:

1. Open https://app.wayfinding.support and sign in with their email. They get a sign-in link.
2. Create a passkey when asked. It needs a recent browser: Chrome or Edge 116+, Safari 18+, or Firefox 139+.
3. Start a journey, for themselves or their team.
4. **Save the recovery key** it shows once. Anyone with that key can read the journey, and Wayfinding cannot recover it.
5. Tell you the journey ID from the address bar (`/journeys/<id>`).

If they already have a journey, ask for its ID.

## 3. Install the agent client

Tell the person this downloads two files from the public release and installs the `wayfinding` command. Show and ask about each command:

```sh
R=https://github.com/AI-Wayfinding/journey/releases/download/v0.1.0
curl -fsSLO "$R/ai-wayfinding-core-0.1.0.tgz"
curl -fsSLO "$R/ai-wayfinding-client-0.1.0.tgz"
npm install -g ./ai-wayfinding-core-0.1.0.tgz ./ai-wayfinding-client-0.1.0.tgz
wayfinding --help
```

If a global install is not allowed, stop and say so. Do not switch to another source.

## 4. Ask for access

Ask the person whether you should be able to add things (`readwrite`) or only read (`read`), and whether you should be remembered on this computer (up to 90 days) or only for this session (up to 8 hours). Session-only is the default. Set `WF_JOURNEY` to their journey ID, then show and run:

```sh
wayfinding mcp --connect "$WF_JOURNEY"
```

to run as an MCP server, or for one command at a time:

```sh
wayfinding connect "$WF_JOURNEY" --scope read
```

Add `--remember` only if the person chose it. The command prints a link and a six-digit code. Ask the person to open the link, check the code matches, choose the access and time, and confirm with their passkey. Wait until the command says it is approved. For an MCP server, show the person the configuration snippet in the client's README (https://github.com/AI-Wayfinding/journey/tree/main/packages/client) and ask before adding it to your client.

## 5. Bring in their documents

Ask for the path to their first position (activity 1) and permission to add it. Show and run:

```sh
wayfinding import "$WF_POSITION" --journey "$WF_JOURNEY"
wayfinding list --journey "$WF_JOURNEY"
wayfinding search "<a word from it>" --journey "$WF_JOURNEY"
```

For teammate interview write-ups, add only those whose interviewee approved it. Leave the rest where they are. Items you add are marked as written by an agent.

You are done when the person has a journey holding their approved documents, can see them in the browser, and knows how to approve or end your access. They can remove you at any time from **People & agents** in the journey.
