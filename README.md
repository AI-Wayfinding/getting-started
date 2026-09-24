# Wayfinding: getting started

Wayfinding helps people and teams decide whether, where and how AI serves their mission, their relationships and their work. Using less AI, or none, is a valid outcome.

This repository holds the instructions an AI agent follows to guide you through Wayfinding. You don't need to read them yourself. Copy this into your AI agent:

```text
I'd like to start Wayfinding. Read these instructions and guide me
step by step. Before you create any files, install anything or share
any data, tell me what you will do and wait for my OK.

curl -fsSL https://wayfinding.support/start.md
```

The agent reads [instructions/start.md](instructions/start.md) and offers four activities:

1. [Your interview](instructions/interview.md): a private conversation about your relationship with AI. It ends with your first position, a short document showing where you stand today.
2. [Interview a teammate](instructions/interview-a-teammate.md): your agent coaches you to interview a colleague, then helps you compare positions.
3. [Set up the tools](instructions/install.md): not released yet.
4. [Share back](instructions/share.md): prepare one lesson for the Wayfinding peer network, which is not open yet.

You can read every instruction here before your agent follows it. Nothing is sent to Wayfinding: your interview and documents stay with you and the AI service you already use.

## How this repository is used

This repository is the source for the agent instructions. [wayfinding.support](https://wayfinding.support) points to them: `https://wayfinding.support/interview.md` redirects to `instructions/interview.md` here, so the short address and this file are always the same text.

## Licence

Not chosen yet. Until a licence is added, you may read these files but not reuse or redistribute them.
