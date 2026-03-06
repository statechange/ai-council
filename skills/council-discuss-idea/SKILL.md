---
name: council-discuss-idea
description: Use the AI Council to discuss, evaluate, or brainstorm an idea. Runs a multi-round council discussion with relevant councilors and returns a synthesis. Use when the user wants expert perspectives on an idea, strategy, architecture, or business problem.
license: MIT
metadata:
  author: ai-council
  version: "1.0"
---

# Council Discuss Idea

Orchestrate a full AI Council discussion to evaluate, brainstorm, or stress-test an idea.

## Installation

If `council` is not already installed:

```bash
npm install -g @statechange/council
```

## When to Use

- The user has an idea they want multiple expert perspectives on
- The user wants to evaluate a business strategy, product concept, or technical architecture
- The user says "let's discuss this," "what do the councilors think," or "run this by the council"
- The user wants to brainstorm or stress-test a proposal

## How to Run a Discussion

### Step 1: Identify the Topic

Extract the core idea or question from what the user said. Frame it as a clear, specific topic that will generate useful discussion. If the topic is vague, ask the user to clarify before proceeding.

### Step 2: Choose Councilors

First, list available councilors:

```bash
council list
```

Select councilors relevant to the topic. Use the `--councilors` flag to filter. Guidelines:

- **Business/strategy topics**: daniel-priestley, marc-andreessen, chan-kim, michael-gerber, russell-brunson, gregor-hohpe
- **Technical/architecture topics**: neal-ford, sam-newman, chip-huyen, zhamak-dehghani, gregor-hohpe
- **Marketing/growth topics**: daniel-priestley, russell-brunson, chan-kim, marshall-mcluhan
- **Learning/education topics**: seymour-papert, chip-huyen, marshall-mcluhan
- **General/broad topics**: Use the starter council (strategist, creative, critic) plus 2-3 relevant author councilors
- **Mix perspectives**: Always include at least one councilor who will challenge the idea (e.g., the critic, sam-newman for pragmatism, marc-andreessen for market reality)

Pick 3-5 councilors for a focused discussion, up to 7 for a broad one.

### Step 3: Run the Discussion

```bash
council discuss "YOUR TOPIC HERE" --councilors id1,id2,id3 --rounds 2
```

Parameters:
- **Topic**: A clear question or statement. Enclose in quotes.
- **--councilors**: Comma-separated councilor IDs (from `council list`)
- **--rounds**: Number of discussion rounds (default 2). Use 1 for quick takes, 2-3 for depth.
- **--mode debate**: Use debate mode when you want councilors to explicitly challenge each other

### Step 4: Present the Results

After the discussion completes, you'll get:
- Individual turns from each councilor across all rounds
- A secretary summary (if configured) with convergence, divergence, and synthesis

Present the results to the user:
1. **Lead with the synthesis** — what did the council agree on? Where did they diverge?
2. **Highlight the most interesting individual perspectives** — especially surprising or contrarian takes
3. **Extract actionable insights** — what should the user actually do based on this discussion?
4. **Offer to go deeper** — "Want me to run another round focusing on X?" or "Should I get the council's take on a specific aspect?"

### Step 5: Continue if Needed

If the user wants to explore further:

```bash
council discuss "FOLLOW-UP TOPIC" --councilors id1,id2,id3 --rounds 1 --continue PREVIOUS_HISTORY_ID
```

The `--continue` flag carries forward context from the previous discussion.

## Example Workflows

### Evaluating a Product Idea

```bash
council discuss "Should we build an AI-powered code review tool that focuses on security vulnerabilities? Our target market is mid-size engineering teams (50-200 developers) who don't have dedicated security engineers." --councilors marc-andreessen,chip-huyen,neal-ford,daniel-priestley,chan-kim --rounds 2
```

### Stress-Testing a Technical Architecture

```bash
council discuss "We're considering migrating our monolithic e-commerce platform to microservices. We have 12 developers and ship weekly. Is this the right move?" --councilors neal-ford,sam-newman,gregor-hohpe,zhamak-dehghani --rounds 2 --mode debate
```

### Brainstorming a Go-to-Market Strategy

```bash
council discuss "We have a developer tool with 500 free users but almost no paid conversions. How do we build a path to revenue?" --councilors russell-brunson,daniel-priestley,marc-andreessen,chan-kim,michael-gerber --rounds 2
```

## Tips

- Frame topics as specific questions or scenarios, not vague themes
- Include context: team size, stage, constraints, what you've already tried
- Use debate mode when you want friction and challenge
- 2 rounds is the sweet spot: round 1 for initial perspectives, round 2 for cross-pollination
- If the discussion reveals a clear tension, run a follow-up focused on that specific tension
