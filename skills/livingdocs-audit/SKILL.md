---
name: livingdocs-audit
description: Check the documentation against the code and report the drift, without changing anything. Use when the user asks whether the docs are still true, wants a documentation audit or drift report, suspects the README or feature docs are stale, inherits an undocumented repository, or says "/livingdocs-audit".
---

# livingdocs: audit

Find every place the documentation and the code disagree, and report it. **This skill is read-only. It writes nothing, ever** — not a fix, not a typo, not a heading. The split between finding and fixing is the human checkpoint; collapsing it destroys the value of both halves.

If the user asks you to fix something mid-audit, finish the findings list first and point them at `/livingdocs-backfill`.

## 1. Cheap pass: the lint

```bash
node bin/livingdocs-lint.mjs --json
```

Structural problems — a missing document, a feature folder absent from `FEATURES.md`, a broken link, a missing heading — come out of here for free. Carry them into the findings list; do not re-derive them by reading.

## 2. Expensive pass: semantic drift

The lint cannot tell whether a document is *true*. Read each feature doc against the code behind it and look for:

- **Behaviour that changed** — the doc describes the old path.
- **Behaviour that was never documented** — an endpoint, flag, or branch the doc does not mention.
- **Capabilities with no doc at all** — code that would qualify as a feature and is nowhere in `FEATURES.md`.
- **Documented behaviour that does not exist** — the doc claims something the code does not do.
- **Config that lies** — a setting that is read nowhere, a limit hardcoded past the config that supposedly controls it, a default the doc gets wrong.
- **Dead surface** — deprecated exports still shipping, endpoints with no caller, functions never invoked.
- **Status that has moved** — a `partial` feature that now works end to end, or a `live` one that quietly regressed.
- **`## Key files` gone stale** — the file list no longer matches the code, which silently breaks `/livingdocs-record`'s ability to find this doc.

Check `README.md`, `VISION.md` and `ROADMAP.md` too. A README describing a three-stage pipeline that has eleven stages is a finding.

Prioritise by how badly a reader would be misled. A wrong claim outranks a missing one.

## 3. Report

A numbered list, newest concern first. Every finding gets exactly four parts:

> **7. Concurrency is documented as configurable but is not**
> - **Docs say:** `features/agent-scheduling/agent-scheduling.md` — "set `MAX_CONCURRENCY` to run more tickets per column".
> - **Code says:** `COLUMN_MAX` is hardcoded to `1`; `config.maxConcurrency` is read nowhere.
> - **Evidence:** `orchestrator/agent-pool.ts:31`, `orchestrator/config.ts:18`.
> - **Proposed fix:** rewrite the paragraph to state one ticket per column, move configurable concurrency to `## Known gaps`.

Keep the numbers stable — they are the interface to the next step. Group by document if the list runs long, but number continuously across groups.

Close with the count and this instruction, spelled out: review the findings and run `/livingdocs-backfill` with the numbers you approve, for example `/livingdocs-backfill 1, 4, 7` or `/livingdocs-backfill all`.

If you find nothing, say so plainly and name what you checked, so the user knows the audit was real.
