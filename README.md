# Wayfinding: getting started

Wayfinding helps people and teams decide whether, where and how AI serves their mission, their relationships and their work. Using less AI, or none, is a valid outcome.

This repository holds the instructions an AI agent follows to guide you through Wayfinding. You don't need to read them yourself. Copy this into your AI agent:

```text
I'd like to start Wayfinding. Read these instructions and guide me
step by step. Before you create any files, install anything or share
any data, tell me what you will do and wait for my OK.

curl -fsSL https://raw.githubusercontent.com/AI-Wayfinding/getting-started/main/instructions/start.md
```

The agent reads [instructions/start.md](instructions/start.md) and offers four activities:

1. [Your interview](instructions/interview.md): a private conversation about your relationship with AI. It ends with your first position, a short document showing where you stand today.
2. [Interview a teammate](instructions/interview-a-teammate.md): your agent coaches you to interview a colleague, then helps you compare positions.
3. [Set up the tools](instructions/install.md): check your agent's capabilities, then set up a private local repository with search and comments.
4. [Share back](instructions/share.md): prepare one lesson for the Wayfinding peer network, which is not open yet.

You can read every instruction here before your agent follows it. The tool does not send data to Wayfinding or anywhere else. Content you share with an AI agent is subject to that service's terms.

## The local tool

The TypeScript tool in [tool/](tool/) creates one Git repository per person or team. It saves positions, interviews, lessons and resources as Markdown, indexes them for search, and stores comments as local Git notes. It offers a command-line interface (CLI) and a Model Context Protocol (MCP) server for compatible agents. It never adds a remote, pushes, or sends repository content anywhere. See [activity 3](instructions/install.md) for the capability check and pinned installation steps. The human-facing [install.sh](install.sh) offers the same installation steps, one confirmation at a time.

## How this repository is used

This repository is the source for the agent instructions. Agents fetch them directly from here. [wayfinding.support](https://wayfinding.support) links to this repository.

## Licence

The code in `tool/` and `install.sh` is under the [MIT licence](LICENSE). The instructions in `instructions/` and other prose in this repository are under [Creative Commons Attribution 4.0 International](LICENSE-CC-BY-4.0) (CC BY 4.0).
