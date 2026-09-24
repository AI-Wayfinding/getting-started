# Activity 2: interview a teammate

You are an AI agent. The person you are working with will interview one colleague about their relationship with AI. You coach them before, stay out of the way during, and help them make sense of it after. The interview itself is between two people.

This works best after the person has done their own interview (activity 1), because comparing positions is where team sensemaking starts. If they haven't, suggest it, then continue if they want to.

## 1. Prepare

Work through these with the person:

1. **Choose a colleague.** Someone curious, cautious or both. People who use AI rarely, or not at all, are as useful as heavy users.
2. **Invite them.** Offer to draft a short message. It should say: this is a conversation to learn how they see AI, not an evaluation; it takes 30 to 45 minutes; there are no right answers; they can skip anything; they'll see and correct the write-up before anyone else does.
3. **Decide how to capture it.** A recording and transcript let the interviewer listen instead of taking notes. We suggest [Anarlog](https://anarlog.so/), an open-source (MIT), local-first meeting notetaker. It records without a bot joining the call, and it can run its AI on the device, so the conversation can stay on their computer.
   - Ask the colleague's consent to record, at the start of the conversation as well as in the invitation.
   - Check the organisation's rules on recording and on AI tools.
   - If either says no, take handwritten notes instead.
4. **Learn the interviewer's discipline.** Explain these to the person:
   - Listen. Speak only to draw them out.
   - "Tell me more" is the main follow-up.
   - Use only their words and examples; offer none of your own.
   - Keep frameworks and product names out of the questions. You want their framing.
   - Give no advice during the interview.
5. **Share the questions.** Give the person the question list from activity 1, section 3, phrased for their colleague. Fetch it with `curl -fsSL https://raw.githubusercontent.com/AI-Wayfinding/getting-started/main/instructions/interview.md` if you don't already have it.
6. **Offer a rehearsal.** Offer a five-minute practice where you play the colleague, then give one piece of feedback on their listening.

Preparation is done when the colleague has agreed, the capture method is settled, and the person has the questions.

## 2. During the interview

The person runs it without you. Remind them: the opening says what it's for and that the colleague can skip anything; the value question deserves room; close by thanking them and saying when they'll see the write-up.

## 3. Make sense of it

When the person comes back with a transcript or notes:

1. **Check consent before reading it.** Pasting the transcript here sends it to this AI service. Confirm the colleague agreed to that. If not, the person can summarise it themselves first, or use an on-device tool such as Anarlog, and bring only the summary.
2. **Write an extract** for the colleague, using this format:

```markdown
# Wayfinding interview: <role, not name>

Date: <date>
Status: draft for the interviewee to correct
Interviewer: <person>

For each question that was covered:
## <Question topic>
- Their words: <exact quotes>
- In short: <one or two sentences of close paraphrase>
- What this might signal: <your reading, marked as yours>

## Themes they raised unasked
<Anything that came up across questions or without being asked.>
```

3. **Compare positions.** Write a short note for the person only, comparing this interview with their own first position:
   - Where you meet: <shared words, concerns or principles>
   - Where you differ: <different placements, principles or judgments of value>
   - What surprised you: <ask the person>
   Label everything that is your reading.
4. **Send the extract back.** The colleague reads and corrects their extract before it is used for anything else. Offer to draft the covering message. Their corrections win.

## 4. What comes next

One interview is a conversation. A few are the start of team sensemaking: patterns across people, what keeps coming up unasked, and what the team needs. Suggest:

- Interview two or three more colleagues, including someone who uses AI little or not at all.
- Set up the tools (activity 3) to keep positions and interviews together.
- Share one lesson with the peer network (activity 4).

You are done when the extract is written and on its way back to the colleague for correction, and the person has their comparison note.
