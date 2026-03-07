---
name: council-create-councilor
description: Create a new AI Council councilor from a person, book, body of work, or concept. Builds the ABOUT.md with frontmatter and system prompt, registers it, and verifies it loads. Use when the user wants to add a new perspective to their council.
license: MIT
metadata:
  author: ai-council
  version: "1.0"
---

# Create a Council Councilor

Build and register a new councilor for the AI Council.

## Prerequisites

```bash
# Ensure council is installed
which council || npm install -g @statechange/council
```

## Procedure

### Step 1: Gather Source Material

Determine what the councilor is based on. This could be:

- **A person/author**: Research their key ideas, frameworks, and perspectives. If they have books in the conversation or accessible online, fetch and read them.
- **A book**: Extract the core thesis, key frameworks, and actionable principles.
- **A concept/role**: Define the perspective, methodology, and decision-making lens.
- **A URL**: Fetch the content and distill the perspective it represents.

If source material is available as a URL or file, fetch it:

```bash
curl -sL "https://example.com/source" -o /tmp/councilor-source.txt
```

### Step 2: Choose an ID

The councilor ID is the directory name. Use lowercase, hyphenated:

- Person: `first-last` (e.g., `neal-ford`, `chip-huyen`)
- Concept: `the-role` (e.g., `the-strategist`, `the-critic`)
- Book-based: `author-name` or `book-slug`

### Step 3: Write the ABOUT.md

Create the councilor directory and ABOUT.md:

```bash
mkdir -p ~/.ai-council/councilors/COUNCILOR_ID
```

The ABOUT.md has two parts:

#### Part 1: YAML Frontmatter

```yaml
---
name: "Display Name"
description: "One-line description of their perspective and expertise"
interests: ["topic1", "topic2", "topic3", "topic4", "topic5"]
backend: "anthropic"
model: "claude-sonnet-4-6"
temperature: 0.7
avatar: "https://api.dicebear.com/9.x/personas/svg?seed=UniqueSlug&backgroundColor=b6e3f4"
---
```

**Field guidance:**

- **name**: How they appear in discussions. Use their real name for real people, a title for archetypes.
- **description**: What they bring to the council. Under 120 chars.
- **interests**: 5-8 terms reflecting their domains. Used for councilor selection matching.
- **backend**: Which LLM backend to use. `anthropic` or `google` are recommended. Use `google` with `gemini-flash-latest` for cheaper councilors.
- **model**: Specific model ID. Good defaults:
  - Anthropic: `claude-sonnet-4-6` (balanced), `claude-haiku-4-5-20251001` (fast/cheap)
  - Google: `gemini-flash-latest` (fast/cheap)
- **temperature**: 0.5-0.6 for analytical thinkers, 0.7 for balanced, 0.8-0.9 for creative/provocative
- **avatar**: For real people, prefer downloading a public-domain image as `avatar.jpg` in the councilor directory and setting `avatar: "avatar.jpg"`. Use DiceBear URL as fallback for fictional personas. Background colors: `b6e3f4` (blue), `ffd5dc` (pink), `c0aede` (purple), `d1d4f9` (lavender), `ffeab6` (yellow).

#### Part 2: System Prompt

Write this directly after the frontmatter closing `---`:

```markdown
You are [Name], [role/credentials]. You serve on a council of experts.

**[Book/Framework Title]**: [Core thesis in 2-3 sentences]. [Key ideas as a structured list or paragraphs, covering 3-6 main principles/frameworks].

When contributing to a discussion:
- [Specific behavioral instruction 1]
- [Specific behavioral instruction 2]
- [Specific behavioral instruction 3]
- [Specific behavioral instruction 4]
- [What makes their perspective unique]

Keep your responses focused and substantive. Aim for 2-4 paragraphs per turn.
```

**System prompt principles:**
- Ground the persona in specific ideas, not vague personality traits
- Name their frameworks and methods explicitly — these are what make the councilor useful
- Behavioral instructions should describe HOW they engage, not just what they know
- End with the standard "2-4 paragraphs per turn" instruction

#### For source-material-heavy councilors

If you have large reference text (book content, articles, essays), append it after the system prompt:

```markdown
---

## Reference Material: [Title]

Draw on the following source material when contributing to discussions.

[Full text here]
```

For large texts, use file concatenation to avoid LLM output limits:

```bash
# Write header (frontmatter + system prompt) to temp file
cat > /tmp/councilor-header.md << 'HEADER'
---
name: "..."
...
---
System prompt here...

---

## Reference Material: Title

Draw on the following source material when contributing to discussions.

HEADER

# Concatenate header + source body
cat /tmp/councilor-header.md /tmp/source-body.txt > ~/.ai-council/councilors/COUNCILOR_ID/ABOUT.md
```

### Step 4: Register the Councilor

```bash
council councilor add ~/.ai-council/councilors/COUNCILOR_ID
```

### Step 5: Verify

```bash
council list 2>/dev/null | grep -A 2 "COUNCILOR_ID"
```

Confirm the councilor appears with correct name, backend, and interests.

## Examples

### From a person/author

User: "Make a councilor based on Simon Sinek"

1. Research Simon Sinek's key ideas (Start With Why, infinite games, leadership)
2. Create `~/.ai-council/councilors/simon-sinek/ABOUT.md`
3. Register with `council councilor add ~/.ai-council/councilors/simon-sinek`

### From a concept

User: "I need a security-focused councilor"

1. Define the security perspective (threat modeling, OWASP, zero trust, attack surface)
2. Create `~/.ai-council/councilors/the-security-hawk/ABOUT.md`
3. Register

### From a URL

User: "Make a councilor based on this article: https://example.com/manifesto"

1. Fetch the URL content
2. Extract the key ideas and frameworks
3. Create the councilor with the article content as reference material
4. Register

## Common Mistakes

- **Too vague**: "You are a business expert who gives good advice" — useless. Name specific frameworks and methods.
- **Too long**: System prompts over ~2KB before reference material. Keep the core prompt tight; put bulk text in reference material section.
- **Wrong temperature**: Using 0.9 for an analytical thinker or 0.5 for a creative provocateur.
- **Missing interests**: These are used for matching in the discuss-idea skill. Always include 5-8 relevant terms.
- **Creating in project directory**: Always use `~/.ai-council/councilors/` — never put councilors in a project's local `./council/` directory.
