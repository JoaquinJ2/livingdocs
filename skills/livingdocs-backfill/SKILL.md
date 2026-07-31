---
name: livingdocs-backfill
description: Apply approved findings from a livingdocs audit to the documentation. Use when the user approves audit findings by number, says to fix findings 1, 4 and 7 or "fix all of them", asks to apply the drift report, or says "/livingdocs-backfill".
---

# livingdocs: backfill

The write half of the audit. You apply **only the findings the user explicitly approved** and nothing else — that restraint is the entire reason `/livingdocs-audit` and this skill are separate.

The format contract for everything you write is in `DDD.md`.

## 1. Establish the approved set

Take the numbers from the user's message: a list (`1, 4, 7`), a range (`1-5`), or `all`.

Match them against the findings list from `/livingdocs-audit` in this session. If there is no such list — a new session, a compacted context — run `/livingdocs-audit` first, present the numbered findings, and ask which to apply. Do not guess at what the old numbers meant.

## 2. Write only those

For each approved finding, apply the fix it proposed. Then stop.

**Refuse scope creep, including your own.** If you notice a problem that is not in the approved set — even an obvious one, even a one-word fix in a file you already have open — leave it alone and list it at the end as a new finding for the user to approve next time. "While I was in there" is how this system stops being trustworthy.

If a fix turns out to be wrong or bigger than the finding described, do not improvise. Say what you found, leave the file as it was, and let the user decide.

Where a fix creates a feature doc, use `../../templates/feature.md` and fill all eight sections. Under `## Related`, link only documents that already exist and name anything unwritten in prose — a link to a file nobody has written is a broken link the lint will hand back to you. Where it corrects a status or an outcome sentence, update the `FEATURES.md` line to match.

## 3. Do not write a changelog entry

Correcting documentation to match code that already shipped is not a change to the product. `CHANGELOG.md` records behaviour changes, and `/livingdocs-record` owns it. The one exception: if applying a finding reveals a real behaviour change that was never recorded, say so and offer `/livingdocs-record` — do not write the entry from here.

## 4. Verify

```bash
node bin/livingdocs-lint.mjs
```

Fix what it reports **within the approved scope**. If the lint surfaces something outside that scope, report it rather than fixing it.

Close with: the findings applied and the files touched, the findings deliberately skipped, and any new finding you spotted and left alone.
