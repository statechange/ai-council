---
name: council-manage
description: Manage AI Council councilors (also spelled counsellors) and discussions from the command line. Create, list, edit, and configure councilors. Run discussions with topic selection and councilor filtering. Use when the user wants to work with AI Council via CLI or needs help managing their council setup.
license: MIT
metadata:
  author: ai-council
  version: "1.0"
---

# Council Manage

Manage AI Council councilors and run discussions from the command line.

## Installation

If `council` is not already installed, install it globally from NPM:

```bash
npm install -g @statechange/council
```

Or run commands directly with `npx @statechange/council`.

## When to Use

- The user wants to create, edit, or delete a councilor
- The user wants to list their councilors and check their status
- The user wants to run a discussion from the CLI
- The user asks about council configuration or troubleshooting

## Councilor Structure

Each councilor lives in its own directory with an `ABOUT.md` file containing YAML frontmatter and a system prompt. Councilors are registered in `~/.ai-council/config.json` and can live anywhere on disk, but the conventional location is `~/.ai-council/councilors/`:

```
~/.ai-council/
  config.json              # Stores registered councilor paths + API keys
  councilors/
    my-councilor/
      ABOUT.md
```

### ABOUT.md Format

```markdown
---
name: "Display Name"
description: "One-line description of this councilor's perspective"
interests: ["topic1", "topic2", "topic3"]
backend: "anthropic"          # anthropic | openai | google | ollama
model: "claude-sonnet-4-5-20250929"  # optional, uses backend default if omitted
temperature: 0.7              # 0.0 - 2.0, optional
---

You are [name], a [description of role and personality].

[Detailed system prompt instructions...]
```

### Available Backends and Default Models

| Backend | Default Model | Requires API Key |
|---------|--------------|-----------------|
| anthropic | claude-sonnet-4-5-20250929 | Yes (ANTHROPIC_API_KEY) |
| openai | gpt-4o | Yes (OPENAI_API_KEY) |
| google | gemini-2.0-flash | Yes (GOOGLE_API_KEY) |
| ollama | llama3.2 | No (local) |

## CLI Commands

### List councilors

```bash
council list
council list --council ./path/to/council/
```

### Run a discussion

```bash
# Inline topic
council discuss "Should we adopt microservices?"

# Topic from file
council discuss ./topics/architecture.md

# With options
council discuss "Topic" --rounds 3 --format md --output ./results

# Specific councilors only
council discuss "Topic" --councilors ./council/strategist ./council/critic
```

### Manage councilor registry

```bash
# Register a councilor from a local directory
council councilor add ./path/to/councilor

# Register councilor(s) from a git repository
council councilor add https://github.com/user/some-councilor.git

# List all registered councilors
council councilor list

# Unregister a councilor (--yes auto-deletes cloned files for git sources)
council councilor remove my-councilor
council councilor remove my-councilor --yes
```

Registered councilors are stored in `~/.ai-council/config.json` under the `councilors` key. Git-cloned councilors are placed at `~/.ai-council/councilors/<name>/`.

URL detection: paths starting with `http://`, `https://`, or ending with `.git` are treated as git URLs; everything else is a local path.

Multi-councilor repos: if the cloned root has no `ABOUT.md`, child directories are scanned for councilors.

### Check configuration

```bash
council config show     # Show backend status
council config scan     # Find API keys
council config import   # Import found keys
```

## Creating a New Councilor

To create a new councilor:

1. Create a directory: `mkdir -p ~/.ai-council/councilors/new-councilor`
2. Create `~/.ai-council/councilors/new-councilor/ABOUT.md` with the frontmatter and system prompt
3. Register it: `council councilor add ~/.ai-council/councilors/new-councilor`
4. Verify with `council councilor list`

**Important:** Always create councilors in `~/.ai-council/councilors/` and register them — never in a project's local `./council/` directory. The `~/.ai-council/` location ensures councilors are available globally regardless of working directory.

### Building a Councilor from Source Material

When creating a councilor based on a real person, historical figure, or body of work, the ABOUT.md should have three distinct layers:

**Layer 1: Frontmatter** — identity and metadata:
```yaml
---
name: "Display Name"
description: "One-line summary of their perspective and what they bring to the council"
interests: ["core-topic-1", "core-topic-2", "core-topic-3"]
backend: "anthropic"
temperature: 0.7
avatar: "avatar.jpg"  # local file preferred; DiceBear URL as fallback for generic personas
---
```

**Layer 2: System prompt** — the "who you are" section written directly after the frontmatter. This should:
- Establish the persona: "You are [Name], [role]. You sit on a council of experts and bring [perspective]."
- Define their **intellectual framework** as a structured list of 3-6 core principles or methods of analysis, each with a brief explanation
- Provide **behavioral instructions** for how they should engage in discussion (what to emphasize, what to question, how to relate to other perspectives)
- Set a **personality/style note** (e.g. rhetorically forceful, measured and empirical, provocative but grounded)
- End with: "Keep your responses focused and substantive. Aim for 2-4 paragraphs per turn."

**Layer 3: Reference material** — the bulk source text appended below. Separated by a markdown horizontal rule and a heading like `## Reference Material: [Title]`. Include a one-line instruction telling the councilor to draw on this material. Then the full text.

#### Build Process for Source-Material Councilors

Because pasting large reference texts directly into an LLM output can trigger content filtering, use a **concatenation approach**:

1. **Download the source material** to a temp file:
   ```bash
   curl -o /tmp/source.txt "https://example.com/source-text"
   ```

2. **Write only the header** (frontmatter + system prompt + reference intro) to a temp file using the Write tool or a heredoc. This is the part you author — keep it under ~2KB.

3. **Extract the relevant portion** of the source (e.g. strip Project Gutenberg headers/footers):
   ```bash
   sed -n '/START_MARKER/,/END_MARKER/p' /tmp/source.txt | sed '1d;$d' > /tmp/source-body.txt
   ```

4. **Concatenate** header + body into the final ABOUT.md:
   ```bash
   mkdir -p ~/.ai-council/councilors/new-councilor
   cat /tmp/header.md /tmp/source-body.txt > ~/.ai-council/councilors/new-councilor/ABOUT.md
   ```

5. **Register** the councilor:
   ```bash
   council councilor add ~/.ai-council/councilors/new-councilor
   ```

This keeps the authored content (which goes through the LLM) small, and the bulk reference text is handled entirely through file operations.

#### Tips

- **Interests**: Pick 5-8 terms that reflect the councilor's core domains. These appear as tags in the UI and help users understand what the councilor brings.
- **Avatar**: Prefer a real image of the person or what they're most associated with. For historical figures, authors, philosophers etc., download a public-domain portrait from Wikimedia Commons into the councilor directory as `avatar.jpg` (use the Wikipedia API to find a thumbnail URL, then `curl -o ~/.ai-council/councilors/<name>/avatar.jpg <url>`). Set `avatar: "avatar.jpg"` in frontmatter — relative paths are resolved automatically. Only fall back to DiceBear (`https://api.dicebear.com/9.x/personas/svg?seed=SlugHere&backgroundColor=hexWithoutHash`) for fictional or generic personas where no real image applies.
- **Temperature**: 0.7 is a good default. Go higher (0.8-0.9) for creative/provocative thinkers, lower (0.5-0.6) for analytical/precise ones.
- **Source material size**: The full Communist Manifesto (~77KB) works fine. Larger texts will too but may increase token costs per discussion turn. Consider excerpting if a source exceeds ~200KB.
- **Multiple sources**: You can append several reference texts with separate `## Reference Material:` headings.
- **Public domain sources**: Project Gutenberg (gutenberg.org) is a good source. Always strip the PG header/footer boilerplate.

## Troubleshooting

### Councilor shows as red / has issues

Usually means the backend API key is missing. Fix with:
```bash
council config show   # Check which keys are missing
council config scan   # Look for keys
council config import # Import found keys
```

### Discussion fails with backend errors

1. Check the backend is configured: `council config show`
2. For ollama: ensure `ollama serve` is running
3. For cloud backends: verify the API key is valid and has credits

## GUI Alternative

All of the above can also be done in the Electron GUI:
```bash
council gui            # Launch from current directory
council gui ~/projects # Launch with a specific working directory
```
- **Settings page**: Configure API keys, test connections, see available models
- **Councilors page**: Browse, create, edit, delete councilors with a form editor
- **Discussion page**: Start discussions with councilor selection and real-time streaming
