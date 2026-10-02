# DDD — Document-Driven Development

The process constitution for this repository. It describes how documentation is produced and kept true. It is not a domain model; the glossary lives elsewhere (see the project section at the bottom).

## The premise

Documentation rots because writing it is a separate act from changing the code. Here it is not separate: a behaviour change is not finished until the documents that describe that behaviour say the new thing. The documents describe **what is true today**, never what someone intends. Intent lives in `ROADMAP.md`.

## The documents

| Document | Answers | Changes when |
| --- | --- | --- |
| `VISION.md` | Where is this going, and what phase are we actually in? | Direction shifts |
| `ROADMAP.md` | What are the next outcomes, in what order? | Priorities shift |
| `FEATURES.md` | What can this product do today? | A capability appears, moves status, or dies |
| `features/<slug>/<slug>.md` | How does one capability actually behave? | That capability's behaviour changes |
| `CHANGELOG.md` | What changed, when, and why? | Every behaviour change |
| `DDD.md` | How do we keep all of the above true? | The process changes |

A **feature** is a user-visible capability stated as a one-sentence outcome. Internal modules are documented inside the feature that owns them — never as a feature of their own. If you cannot state a thing as an outcome a user would recognise, it is not a feature.

## Format contract

These formats are enforced by `bin/livingdocs-lint.mjs`. Do not improvise around them.

### Feature doc

Lives at `features/<slug>/<slug>.md`. The slug is kebab-case and identical in the folder name, the file name, and the `FEATURES.md` link. Exactly these eight H2 headings, in this order, none omitted:

```markdown
# <Feature Title>

> <one-sentence user-visible outcome>

**Status:** live

## Why it exists
## Behaviour
## Boundaries
## Key files
## Data
## Gates and failure modes
## Known gaps
## Related
```

`**Status:**` accepts only `live`, `partial`, or `planned`.

What belongs under each heading:

- **Why it exists** — the problem this capability removes. One short paragraph.
- **Behaviour** — what an observer sees, step by step or case by case. The bulk of the doc.
- **Boundaries** — what it explicitly does not do, so nobody assumes it does.
- **Key files** — the files that implement it, each with a few words on its role. This section is how tooling and agents map a code change back to this doc, so keep it accurate.
- **Data** — what it reads and what it writes: state, files, tables, external APIs.
- **Gates and failure modes** — where it stops for a human, what happens when it breaks, what it retries.
- **Known gaps** — the honest list. An empty section is a lie in most features; write `None known.` only when you mean it.
- **Related** — ADRs, the roadmap phase, and neighbouring feature docs. Link only documents that already exist: a relative link to a file nobody has written yet is a broken link and a lint failure. Name an unwritten one — a roadmap phase before `ROADMAP.md` exists, an ADR still to be written — in prose, and turn it into a link when it lands.

### FEATURES.md entry

One line per feature, slug identical in all three positions:

```markdown
- **[<slug>](features/<slug>/<slug>.md)** — <one-sentence outcome> · `<status>`
```

### CHANGELOG.md

`# Changelog`, then dated blocks `## YYYY-MM-DD`, newest first. Under each date, only the subsections that apply, in this order: `### Added`, `### Changed`, `### Fixed`, `### Removed`. Every bullet names in backticks the document that describes what it changed — normally the feature doc it affects.

Some user-visible changes belong to no capability: the documentation system itself, the tooling around it, a repo-wide convention. Those bullets name the root document that describes them instead — `DDD.md` for the process and its tooling, `FEATURES.md` for the index of capabilities. Never invent a feature so a bullet has somewhere to point.

```markdown
## 2026-07-29

### Added

- Board now shows the queue depth per column · `features/live-dashboard/live-dashboard.md`
- `node bin/livingdocs-lint.mjs` checks the documentation structurally on demand · `DDD.md`

### Fixed

- Runs orphaned by a restart are recovered instead of hanging · `features/run-recovery/run-recovery.md`
```

## The workflow

1. **Change the code.** The unit of work is the change, not the file.
2. **Run `/livingdocs-record`** before you call the work done. It reads the real diff, writes the changelog entry, and updates every feature doc the diff touched. The agent does this itself; nothing re-prompts after the turn ends.
3. **Run `/livingdocs-audit`** periodically, or when you inherit a repo you do not trust. It writes nothing; it produces a numbered findings list. Approve the numbers you agree with and run `/livingdocs-backfill` with them.

## The rules

- **Documents state the present tense.** No "will", no "should". If it does not work yet, its status is `planned` or `partial` and the doc says which parts.
- **The code wins.** When a document and the code disagree, the document is wrong until a human says otherwise. Never edit code to match a doc without asking.
- **One capability, one doc.** Do not split a capability across docs because the code is split across modules.
- **A capability with no doc is a bug in the documentation**, and `/livingdocs-record` fixes it by writing the missing doc.
- **Session context supplies the *why*, the diff supplies the *what*.** Never document a change you did not see in the diff.
- **Never delete a feature doc silently.** Removing a capability is a `### Removed` changelog bullet and a deleted `FEATURES.md` line.

## Project specifics

- **Issues and specs live at:** {{ISSUE_LOCATION}}
- **Feature docs live at:** {{FEATURE_DOC_LOCATION}}
- **Glossary and decisions live at:** {{GLOSSARY_AND_ADR_LOCATION}}
- **Code paths that trigger the documentation obligation:** {{TRIGGER_PATHS}}
- **Paths that satisfy it:** {{SATISFYING_PATHS}}

Those last two lists are configuration, not prose: they live in [`.livingdocs.json`](.livingdocs.json) at the repo root, where `bin/livingdocs-lint.mjs` reads them. Change them there and mirror the change here. The lint falls back to built-in defaults if that file is missing or malformed.

{{PROJECT_NOTES}}
