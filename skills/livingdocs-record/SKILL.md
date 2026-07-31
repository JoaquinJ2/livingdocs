---
name: livingdocs-record
description: Record the current change in CHANGELOG.md and update every feature doc it affects. Use when the user finishes a change and asks to update the docs or changelog, says the work is done and needs documenting, is prompted by the livingdocs stop hook, or says "/livingdocs-record".
---

# livingdocs: record

The one skill you run at change time. **The diff says what changed; the session says why.** Never document a change you cannot see in the diff, and never let the diff alone write the reason.

The format contract for everything you write is in `DDD.md`.

## 1. Read the change

```bash
git status --porcelain
git diff HEAD
```

Untracked files matter as much as modified ones — read every new file in full. If the diff is empty, say so and stop; there is nothing to record. If it is very large, work from `git diff HEAD --stat` and read the files that actually changed behaviour.

Sort what you find into **observable behaviour changes** and **everything else**. Refactors, formatting, dependency bumps and internal renames that no observer can detect do not get a changelog entry — but they may still change `## Key files` in a feature doc, so do not discard them.

Now take the *why* from the session: the intent behind the change, the trade-off, the bug report it answers. If you were not present for that conversation, ask — one short question — rather than inventing a rationale.

## 2. Map the change to features

For each changed file, find the feature doc whose `## Key files` lists it. That is the affected feature. A single change usually touches two or three.

If a changed file appears in no feature doc, decide which it is:

- **It belongs to an existing feature** whose `## Key files` is out of date — add it there.
- **It is a capability with no doc at all** — create `features/<slug>/<slug>.md` from `../../templates/feature.md`, filling all eight sections. Under `## Related`, link only documents that already exist and name the rest in prose; a link to an unwritten file is a lint failure. Announce this; a new feature doc is a bigger deal than a changelog line.
- **It is user-visible but owned by no capability** — the documentation system itself, the tooling, hooks or plugins around it, a repo-wide convention every contributor now follows. It gets a changelog bullet naming the root document that describes it — `DDD.md` for the process and its tooling, `FEATURES.md` for the index — and no feature doc. Never invent a feature so the bullet has somewhere to point; a capability nobody can ask for is not a capability.
- **It is not user-visible** (build config, test helper, CI) — no doc, no changelog entry.

## 3. Write

Get today's date with `date +%F` rather than assuming it.

**`CHANGELOG.md`** — add a `## YYYY-MM-DD` block at the top, or merge into today's block if one already exists. Use only the subsections that apply, in order: `### Added`, `### Changed`, `### Fixed`, `### Removed`. Each bullet states the observable change in the present tense and names in backticks the document that describes it — the affected feature doc, or the root document from the third bucket above when no capability owns the change. Write for someone deciding whether this change affects them.

**Each affected feature doc** — update the sections the change actually moved. `## Behaviour` when behaviour moved, `## Key files` when files appeared or disappeared, `## Gates and failure modes` when a gate or an error path changed, `## Known gaps` when a gap was closed *or opened*. Bump `**Status:**` if the capability crossed a line between `planned`, `partial` and `live`.

**`FEATURES.md`** — only if the outcome sentence or the status changed. This line is the one-sentence summary of the capability; a change that makes it stale makes the whole index lie.

## 4. Offer an ADR, sparingly

If the change embeds a hard-to-reverse decision, offer to write one under `docs/adr/`. All three must hold:

1. **Hard to reverse** — changing your mind later costs something real.
2. **Surprising without context** — a future reader will ask "why this way?"
3. **The result of a real trade-off** — there were genuine alternatives.

If any one is missing, skip it and say nothing. Most changes do not qualify.

## 5. Verify

```bash
node bin/livingdocs-lint.mjs
```

Fix everything it reports, then re-run until clean. Close with the changelog bullets you wrote and the feature docs you touched, so the user can see what the change now claims about itself.
