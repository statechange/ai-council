---
name: council-discuss-idea
description: Run a council discussion on any topic, idea, or URL. Automatically selects relevant councilors from those installed, runs a multi-round debate, and returns only the summary. Full transcript is saved to a temp file for optional deep-dive. Use when you need expert perspectives on a strategy, architecture, product, or business problem.
license: MIT
metadata:
  author: ai-council
  version: "2.0"
---

# Council Discuss Idea

Run a focused council discussion and return a clean summary. The full debate transcript is saved to a temp file — not loaded into context — so the caller can grep it if needed.

## Prerequisites

Council CLI must be installed. If `council` is not found:

```bash
npm install -g @statechange/council
```

A secretary backend must be configured (it produces the summary). Check with:

```bash
council config show
```

## Procedure

### Step 1: Discover Available Councilors

```bash
council list 2>/dev/null | grep -E '^\w|^  Backend|^  Interests'
```

Parse the output to get councilor IDs and their interests/descriptions. Only use councilors that are actually listed — do not assume any are available.

### Step 2: Select Councilors for the Topic

Based on the topic and each councilor's listed interests/description, pick 3-5 councilors that are most relevant. Guidelines:

- **Always include diverse perspectives** — at least one who will naturally challenge the idea
- **Match by interests** — the councilor list shows each one's interests, use those to match
- **Prefer fewer, more relevant councilors** over many loosely related ones
- **3-5 is ideal** — enough for cross-pollination, not so many it dilutes focus

### Step 3: Run the Discussion

```bash
council discuss "THE TOPIC OR QUESTION" \
  --councilors id1,id2,id3,id4 \
  --rounds 2 \
  --format json \
  --output /tmp/council-discussions \
  2>&1
```

**Important notes:**
- The topic can include URLs — they will be automatically fetched and included as context
- Use `--rounds 2` for good depth (round 1 = initial takes, round 2 = cross-pollination)
- Use `--format json` so the full structured output is saved
- Use `--output /tmp/council-discussions` to keep transcripts in a predictable location
- The CLI streams output to stderr while running — capture both stdout and stderr

### Step 4: Extract the Summary

The JSON output file contains the full discussion. Extract just the summary:

```bash
# Find the most recent output file
TRANSCRIPT=$(ls -t /tmp/council-discussions/council-*.json 2>/dev/null | head -1)

# Extract the summary (the secretary's synthesis)
cat "$TRANSCRIPT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
summary = data.get('summary', '')
if summary:
    print(summary)
else:
    # No secretary summary — fall back to last round turns
    for turn in data.get('turns', []):
        if turn['round'] == data.get('rounds', 1):
            print(f\"**{turn['councilorName']}**: {turn['content']}\n\")
"
```

### Step 5: Return Results to the Caller

Present to the user:

1. **The summary** — this is the primary output. It contains convergence, divergence, and synthesis.
2. **The transcript path** — mention it so the user (or agent) can dive deeper: "Full transcript saved to `{TRANSCRIPT}`"
3. **Brief councilor attribution** — which councilors participated (names only)

**Do NOT** dump the full transcript into the response. The whole point is keeping context clean.

If the user wants to explore a specific councilor's take or a specific point of contention, THEN grep the transcript file:

```bash
# Find what a specific councilor said
grep -A 50 '"councilorName": "Neal Ford"' "$TRANSCRIPT"

# Or read the full markdown for human consumption
cat /tmp/council-discussions/council-*.md | head -200
```

## Example

User says: "What do you think about building a SaaS that helps restaurants manage food waste using computer vision?"

```bash
# Step 1: Check who's available
council list 2>/dev/null | grep -E '^\w'

# Step 2: Pick relevant councilors (suppose we found these)
# marc-andreessen (market/startups), chip-huyen (AI/CV), daniel-priestley (business model), chan-kim (market creation), critic (stress test)

# Step 3: Run it
council discuss "Should we build a SaaS that helps restaurants manage food waste using computer vision? The idea is to use cameras in kitchens to identify and quantify food waste, then provide actionable insights to reduce it. Target market is mid-to-large restaurant chains (50+ locations)." \
  --councilors marc-andreessen,chip-huyen,daniel-priestley,chan-kim,critic \
  --rounds 2 \
  --format json \
  --output /tmp/council-discussions \
  2>&1

# Step 4: Get the summary
TRANSCRIPT=$(ls -t /tmp/council-discussions/council-*.json | head -1)
python3 -c "import json; d=json.load(open('$TRANSCRIPT')); print(d.get('summary','No summary generated'))"
```

Then respond with the summary + transcript path.
