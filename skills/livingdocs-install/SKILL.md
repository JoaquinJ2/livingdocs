---
name: livingdocs-install
description: Install the livingdocs documentation system into a repository. Use when the user asks to set up livingdocs, install living documentation, scaffold DDD.md / CHANGELOG.md / FEATURES.md, add the documentation lint script, or says "/livingdocs-install".
---

# livingdocs: install

Deterministic scaffold. **Ask nothing.** Read the repository, write the files, report what changed. Every step is idempotent — re-running this skill must never duplicate a section or a file.

Templates live at `../../templates/` relative to this file. Assets live at `../../assets/`.

## What this skill does not do

It does not write `VISION.md`, `ROADMAP.md`, `FEATURES.md` entries, or any feature doc. Those come from `/livingdocs-vision` and `/livingdocs-inventory`. Say this in your closing report so the user knows the scaffold is deliberately half-empty.

## 1. Read the repository first

Before writing anything, gather the four project-specific facts that `DDD.md` records:

- **Where issues and specs live** — check `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, `.scratch/`, `.github/ISSUE_TEMPLATE/`, or a Jira/Linear reference in the README. If nothing points either way, write `Not configured.`
- **Where the glossary and decisions live** — look for `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`. These are a different system from feature docs and must not be merged with them.
- **Which top-level paths change observable behaviour** — the trigger paths. These are anything whose contents change what the software does, not only compiled or interpreted source. Start with the source directories (`src/`, `app/`, `lib/`, `bin/`, and any service or package roots), then add the payload directories that are behaviour in another form: prompt directories, `skills/` and other agent-instruction trees, workflow, rule and policy files, schemas, and configuration the product reads at runtime. Editing a `SKILL.md` or a prompt template changes what the system does as surely as editing a function, so those directories belong on the list. Ignore build output, `node_modules/`, fixtures, and anything in `.gitignore`. When a directory is genuinely borderline, include it: a spurious trigger path only makes the lint ask whether the changelog is behind, a missed trigger path costs a silent documentation gap.
- **The project name** — from `package.json`, the README title, or the directory name.

## 2. Write the scaffold

Create each of these only if it is absent. If it already exists, leave it alone and note it as "already present" in the report.

- `.livingdocs.json` — the trigger-path config the lint script reads. Write the trigger paths from step 1 as directory prefixes, payload directories included:

```json
{
  "triggerPaths": ["src/", "app/", "bin/", "prompts/"],
  "satisfyingPaths": ["CHANGELOG.md", "features/"]
}
```

- `DDD.md` — from `templates/DDD.md`. Fill the project section at the bottom: `{{ISSUE_LOCATION}}`, `{{FEATURE_DOC_LOCATION}}` (`features/<slug>/<slug>.md`), `{{GLOSSARY_AND_ADR_LOCATION}}`, `{{TRIGGER_PATHS}}` and `{{SATISFYING_PATHS}}` (the same two lists you just wrote to `.livingdocs.json`, so the doc and the config say the same thing). Use `{{PROJECT_NOTES}}` for anything else a newcomer needs — or delete the placeholder line if there is nothing.
- `CHANGELOG.md` — from `templates/CHANGELOG.md` with `{{CHANGELOG_ENTRIES}}` removed. No dated blocks yet.
- `FEATURES.md` — from `templates/FEATURES.md` with `{{FEATURE_ENTRIES}}` removed. Skeleton only.
- `features/` — create the directory with an empty `.gitkeep` so git tracks it.

Leave no `{{PLACEHOLDER}}` behind in any file you write.

## 3. Install the lint

- `assets/livingdocs-lint.mjs` → `bin/livingdocs-lint.mjs`

Copy the lint script **verbatim** — byte for byte, no retyping, no edits, not even to the path lists. It reads `.livingdocs.json` for the repo-specific paths, so there is nothing in it to customise, and an edited copy is silently reverted by the next plugin update. Overwrite the destination if it already exists — the plugin owns it.

Livingdocs does not install a Cursor hook. The agent updates the docs with `/livingdocs-record` as part of the change; `/livingdocs-audit` catches anything that was skipped. If a previous install left the stop hook behind, remove it and leave every unrelated hook alone:

- Delete `.cursor/hooks/livingdocs-stop.sh` if it exists.
- If `.cursor/hooks.json` exists, remove every `stop` entry whose `command` is `.cursor/hooks/livingdocs-stop.sh`. Keep the existing `version` and every other event. If the `stop` array is empty afterwards, delete that key. If `hooks` is then empty, delete `.cursor/hooks.json`. Never rewrite or drop an unrelated entry.

## 4. Wire AGENTS.md

Append a `## Living documentation` section to `AGENTS.md` (create the file if absent). If a section with that exact heading is already there, replace its body and nothing else. Never touch other sections, and never rewrite the file wholesale.

```markdown
## Living documentation

Documentation is part of the change, not a follow-up. Before calling any behaviour change done, run `/livingdocs-record` — it reads the real diff and updates `CHANGELOG.md`, the affected `features/<slug>/<slug>.md` docs, and `FEATURES.md`.

The format contract and the full workflow are in `DDD.md`. Validate with `node bin/livingdocs-lint.mjs`.

Feature docs describe capabilities. They are not a replacement for the glossary or for ADRs, which keep their existing homes.
```

If the repository uses `CLAUDE.md` instead of or alongside `AGENTS.md`, apply the same section there too.

## 5. Report

List every path created, every path skipped as already present, and the trigger paths you wrote to `.livingdocs.json` so the user can correct them. Then give the next two steps: `/livingdocs-vision` (optionally with a seed document) to write `VISION.md` and `ROADMAP.md`, and `/livingdocs-inventory` to derive the feature docs from the code.

Do not run the lint yet, and warn the user that it will report `VISION.md` and `ROADMAP.md` missing until `/livingdocs-vision` has run. That is the expected state of a fresh install, not a failure.
