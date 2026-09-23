# Using bo-grid with an AI coding assistant

bo-grid ships machine-readable references so an AI agent generates correct
code against it — real prop names, real subpath boundaries, no invented API —
instead of guessing from a half-remembered training example.

## 1. `llms.txt` / `llms-full.txt` — works with any agent that fetches URLs

Published alongside the live demo:

- **[llms.txt](https://bonguynvan.github.io/bo-grid/llms.txt)** — a short
  index: what bo-grid is, the facts that matter most, links to the rest.
- **[llms-full.txt](https://bonguynvan.github.io/bo-grid/llms-full.txt)** —
  the complete reference: every `ColumnDef`/`<Grid>` prop, every subpath's
  exports, runnable snippets, and a "things an AI commonly gets wrong" list.
  Paste this whole file into a chat, or point an agent that can fetch URLs
  (Cursor, Windsurf, Claude Code with a rule that tells it to, ChatGPT with
  browsing) at it before asking for bo-grid code.

Tools that already look for a project's own `llms.txt` will find these if you
vendor bo-grid's copy or link to it from your own project's `llms.txt`.

## 2. Project rule files — install once, every session gets it right

Two ready-to-copy files, same guidance in each tool's format:

| Tool | File | Where it goes in *your* project |
| --- | --- | --- |
| Cursor / Windsurf | [`cursor-rules.mdc`](./cursor-rules.mdc) | `.cursor/rules/bo-grid.mdc` |
| Claude Code / any agent reading `CLAUDE.md`/`AGENTS.md` | [`claude-md-snippet.md`](./claude-md-snippet.md) | append into your `CLAUDE.md` (or `AGENTS.md`) |

Both are short by design (they're injected into every relevant prompt) and
point to `llms-full.txt` for anything beyond the essentials, rather than
duplicating the whole API surface into a rule file that goes stale.

## 3. Keeping these current

These files describe the API as of the version in `package.json` at the time
they were last updated. If you hit a mismatch, `CHANGELOG.md` is the source
of truth — open an issue if `llms-full.txt` is out of date with a release.
