---
name: livingdocs-vision
description: Write or rewrite VISION.md and ROADMAP.md, optionally distilled from a seed document. Use when the user asks for a vision or roadmap document, wants a strategy doc turned into VISION.md, points at a seed or architecture document to distil, asks what phase the project is really in, or says "/livingdocs-vision".
---

# livingdocs: vision

Produce `VISION.md` and `ROADMAP.md` from `../../templates/`. Two rules govern everything below: **the code is evidence and the seed is a claim**, and **you ask one question at a time**.

Run `/livingdocs-install` first if `DDD.md` is missing.

## With a seed document

The user may pass a path (`/livingdocs-vision docs/strategy.md`). If they mention a seed but give no path, ask for it — that is a legitimate first question.

### Distil, never transcribe

Read the seed and reduce it to a list of discrete **claims**: what the product is, who it is for, what phase it is in, what it will do next. A claim is one assertion you could be wrong about. Aspiration and description are usually tangled together in a seed document; separate them, because `VISION.md` needs the end state and `ROADMAP.md` needs the ordering, and neither wants the seed's prose.

### Cross-check every claim against the code

For each claim, go and look. Entry points, routes, config, scripts, `FEATURES.md` if it has entries yet. Then classify:

- **Confirmed** — the code does this. Use it.
- **Contradicted** — the code does something else, or nothing. This is the valuable finding.
- **Aspirational** — the seed describes a future state and is honest about it. It belongs in `ROADMAP.md`, not in the "current phase" section of `VISION.md`.
- **Ambiguous** — the seed could mean two things and the code does not settle it. This is a question for the user.

**Report contradictions before you write anything.** A short list: what the seed says, what the code does, the file that proves it. Do not silently pick a side and do not bury it in the document — the whole point of seeding from a document is to find where the story and the software diverged.

## Without a seed

Same job, blank page. Build the claim list from the code itself — README, entry points, dependencies, what the app actually exposes — then interview to get the intent that the code cannot tell you: who it is for, what it is deliberately not, where it is going.

## The interview

Only ask about what you genuinely cannot resolve: ambiguities, contradictions the user must adjudicate, and the parts of vision that live only in someone's head. If the seed is clear and the code agrees, do not ask — write it.

**One question at a time. Wait for the answer before asking the next.** Batching questions is bewildering and produces worse answers than asking six times. Each question should be answerable in a sentence, should carry the evidence that prompted it, and should offer the two or three plausible readings when there are only two or three:

> `docs/strategy.md` says the pipeline has three stages, but `orchestrator/pipeline.ts` implements eleven and the README names three. Is the three-stage story the intended end state, the old design, or a simplification for external readers?

Stop asking as soon as you can write both documents honestly. Five sharp questions beat fifteen thorough ones.

## Writing

- `VISION.md` — the end state, and separately the **current phase**, stated so nobody mistakes aspiration for reality. The "What exists today" list must be defensible from the code, not from the seed.
- `ROADMAP.md` — phases, not dates. Now / Next / Later, each a set of observable outcomes. Anything you classified as aspirational lands here. Unresolved questions go in the Open questions section rather than being invented away.

Fill every `{{PLACEHOLDER}}`; delete any section that genuinely does not apply rather than leaving it hollow. Keep both documents short enough that someone reads them in full.

## Boundaries

Do not write `FEATURES.md`, feature docs, or `CHANGELOG.md` — `/livingdocs-inventory` and `/livingdocs-record` own those. Do not edit code to match the vision. When you finish, point the user at `/livingdocs-inventory`.
