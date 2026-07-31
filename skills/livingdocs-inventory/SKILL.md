---
name: livingdocs-inventory
description: Derive the repository's user-visible capabilities from the code and write FEATURES.md plus one feature doc each. Use when the user asks to inventory features, document an existing or inherited codebase, backfill feature docs for code that was never documented, populate FEATURES.md, or says "/livingdocs-inventory".
---

# livingdocs: inventory

Turn a codebase into an approved list of capabilities, then into documents. **Propose the slicing and get approval before writing a single file** — the slicing is the decision that matters, and it is cheap to argue about and expensive to redo.

Run `/livingdocs-install` first if `FEATURES.md` is missing. The format contract for both files you write is in `DDD.md`; the feature doc shape is `../../templates/feature.md`.

## 1. Read the code

Entry points, routes and handlers, CLI commands, background jobs, UI screens, the public surface of each module, config and feature flags. `VISION.md` if it exists tells you what the product is *for*, which changes how you name things.

If a planning artefact already proposes a slicing — a plan file under `.cursor/plans/`, a spec under `.scratch/`, an architecture doc — read it and use it as your starting point rather than inventing a fresh one. It is a proposal, not truth: verify every entry against the code and say which entries you changed and why.

## 2. Slice into capabilities

**A feature is a user-visible capability stated as a one-sentence outcome.** The test: can you name someone who wants this, and what they get? "Resume runs orphaned by a restart" passes. "The scheduler module" does not.

- **Internal modules are not features.** A parser, a client wrapper, a state machine — each gets documented under `## Key files` and `## Behaviour` of the feature that owns it. If two features share a module, it appears in both.
- **A capability that spans five files is still one feature.** Slice by what the user gets, never by where the code lives.
- **Aim for roughly five to twenty features** in a normal repository. Thirty means you sliced by module; three means you sliced by subsystem.
- **Undocumented and half-built behaviour still counts.** An endpoint with no UI is a `partial` feature, not an omission — those are exactly the entries that make this inventory worth doing.

Assign each one a kebab-case slug, a one-sentence outcome, and a status: `live` (works end to end), `partial` (some of it ships), `planned` (documented, not built).

## 3. Present for approval — write nothing yet

Show the full proposed slicing as a numbered list: slug, one-sentence outcome, status, and the main files behind it. Under it, flag the judgement calls explicitly — anything you merged, anything you split, anything you could not decide whether to call a feature — and any behaviour you found that the existing docs or README contradict.

Then stop and ask for approval. Accept edits: renames, merges, splits, removals. Re-present if the changes are substantial. **Do not create files until the user approves.**

## 4. Write

For each approved feature, `features/<slug>/<slug>.md` from the template — the slug identical in folder, file and link. When you write the first one, delete `features/.gitkeep` if it is there: `/livingdocs-install` created it only so git would track an empty directory, and a directory with feature docs in it no longer needs the placeholder.

Fill all eight sections from the code, not from imagination:

- `## Behaviour` is the bulk of the doc and must be checkable against the code by the next reader.
- `## Key files` is load-bearing: `/livingdocs-record` and `/livingdocs-audit` use it to map a diff back to this doc. List real paths with a few words on each one's role.
- `## Known gaps` is where the honesty goes — the hardcoded constant, the config that is never read, the endpoint with no caller. Write `None known.` only when you mean it.
- `## Related` links neighbouring features, relevant ADRs, and the roadmap phase — but **only documents that already exist.** A relative link to a file nobody has written yet is a broken link and a lint failure, and on a fresh repo `ROADMAP.md` and `docs/adr/` are exactly the files that do not exist yet. Name those in prose instead, and leave the link for whoever writes the document.

Then write the `FEATURES.md` entries, one line per feature in the order that makes sense to a reader — roughly the order a user meets them, not alphabetical.

## 5. Verify

Run `node bin/livingdocs-lint.mjs` and fix everything it reports **that this skill owns** — the feature docs and `FEATURES.md`.

Two findings are expected and are not yours to fix: `VISION.md` and `ROADMAP.md` missing. Those come from `/livingdocs-vision`, this skill must not write them, and writing an empty one to silence the lint is worse than the finding. Report them as outstanding and point at `/livingdocs-vision`. Anything else the lint reports is yours.

Close with the count of features documented, the findings you left standing, and any judgement call the user should sanity-check.

Do not write `CHANGELOG.md` entries — an inventory of what already exists is not a change.
