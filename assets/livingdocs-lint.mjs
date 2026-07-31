#!/usr/bin/env node
/**
 * livingdocs lint — deterministic structural checks over a repo's living documentation.
 *
 * Usage: node livingdocs-lint.mjs [--json] [repo-root]
 * Exit 0 when clean, 1 when there are findings.
 *
 * Reads `.livingdocs.json` at the repo root for `triggerPaths`; falls back to
 * built-in defaults when that file is absent or unusable.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DOCS = ['VISION.md', 'DDD.md', 'ROADMAP.md', 'CHANGELOG.md', 'FEATURES.md'];
const REQUIRED_H2 = [
  'Why it exists',
  'Behaviour',
  'Boundaries',
  'Key files',
  'Data',
  'Gates and failure modes',
  'Known gaps',
  'Related',
];
const STATUS_VALUES = ['live', 'partial', 'planned'];
const CONFIG_FILE = '.livingdocs.json';
const DEFAULT_TRIGGER_PATHS = ['orchestrator/', 'web/app/', 'web/lib/', 'bin/', 'plugin/'];
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CHECK_TITLES = {
  1: 'root documents exist',
  2: 'feature slug and doc filename',
  3: 'FEATURES.md and features/ agree',
  4: 'feature doc structure',
  5: 'relative links resolve',
  6: 'CHANGELOG.md is not behind the code',
};

function parseArgs(argv) {
  const opts = { json: false, root: process.cwd(), help: false };
  for (const arg of argv) {
    if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`);
    else opts.root = arg;
  }
  return opts;
}

const USAGE = `livingdocs lint — structural checks for the livingdocs documentation system.

  node livingdocs-lint.mjs [--json] [repo-root]

  --json   machine-readable output
  repo-root defaults to the current working directory

Exits 0 when clean, 1 when there are findings.`;

/** Blank out fenced code blocks so example markdown inside them is never linted. */
function stripFences(text) {
  const lines = text.split('\n');
  let inFence = false;
  let fence = '';
  return lines
    .map((line) => {
      const opener = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (!inFence && opener) {
        inFence = true;
        fence = opener[1][0];
        return '';
      }
      if (inFence) {
        const closer = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
        if (closer && closer[1][0] === fence) inFence = false;
        return '';
      }
      return line;
    })
    .join('\n');
}

function readText(absPath) {
  try {
    return readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Trigger paths from `.livingdocs.json`. Falls back to the defaults whenever the
 * file is absent, unreadable, not JSON, or does not carry a usable array — a bad
 * config must never turn into a lint finding about something else.
 */
function loadTriggerPaths(root) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(root, CONFIG_FILE), 'utf8'));
  } catch {
    return DEFAULT_TRIGGER_PATHS;
  }
  const configured = parsed && typeof parsed === 'object' ? parsed.triggerPaths : null;
  if (!Array.isArray(configured)) return DEFAULT_TRIGGER_PATHS;
  const usable = configured.filter((entry) => typeof entry === 'string' && entry.trim() !== '');
  return usable.length ? usable : DEFAULT_TRIGGER_PATHS;
}

function isDirectory(absPath) {
  try {
    return statSync(absPath).isDirectory();
  } catch {
    return false;
  }
}

function listFeatureDirs(featuresDir) {
  let entries;
  try {
    entries = readdirSync(featuresDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => !entry.name.startsWith('.'))
    .filter((entry) => (entry.isDirectory() ? true : entry.isSymbolicLink() && isDirectory(join(featuresDir, entry.name))))
    .map((entry) => entry.name)
    .sort();
}

/** Relative markdown links, minus external URLs and pure anchors. */
function extractRelativeLinks(text) {
  const links = [];
  const lines = stripFences(text).split('\n');
  lines.forEach((line, index) => {
    const pattern = /(!?)\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const target = match[2];
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) continue; // http:, mailto:, etc.
      if (target.startsWith('//')) continue; // protocol-relative
      if (target.startsWith('#')) continue; // same-document anchor
      links.push({ target, line: index + 1 });
    }
  });
  return links;
}

function resolveLinkTarget(target) {
  const withoutFragment = target.split('#')[0].split('?')[0];
  if (!withoutFragment) return null;
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

function run(root) {
  const findings = [];
  const toRel = (abs) => relative(root, abs).split(sep).join('/') || '.';
  const add = (check, rule, file, message, line) => {
    findings.push({ check, rule, file, message, ...(line ? { line } : {}) });
  };

  // ---------------------------------------------------------------- check 1
  const presentRootDocs = new Set();
  for (const doc of ROOT_DOCS) {
    if (existsSync(join(root, doc))) presentRootDocs.add(doc);
    else add(1, 'missing-root-document', doc, 'required root document is missing');
  }

  const featuresDir = join(root, 'features');
  const hasFeaturesDir = isDirectory(featuresDir);
  if (!hasFeaturesDir) {
    add(1, 'missing-features-dir', 'features/', 'required features/ directory is missing');
  }

  // ---------------------------------------------------------------- check 2
  const featureSlugs = hasFeaturesDir ? listFeatureDirs(featuresDir) : [];
  /** slug -> repo-relative path of its doc, for slugs whose doc actually exists */
  const featureDocs = new Map();

  for (const slug of featureSlugs) {
    const dirAbs = join(featuresDir, slug);
    const docAbs = join(dirAbs, `${slug}.md`);
    if (!KEBAB_CASE.test(slug)) {
      add(2, 'non-kebab-slug', `features/${slug}/`, `slug "${slug}" is not kebab-case (lowercase letters, digits and single hyphens)`);
    }
    if (existsSync(docAbs) && !isDirectory(docAbs)) {
      featureDocs.set(slug, toRel(docAbs));
      continue;
    }
    let siblings = [];
    try {
      siblings = readdirSync(dirAbs).filter((name) => name.endsWith('.md'));
    } catch {
      /* unreadable directory reads as empty */
    }
    const detail = siblings.length
      ? `found ${siblings.join(', ')} instead`
      : 'directory contains no markdown file';
    add(2, 'feature-doc-name-mismatch', `features/${slug}/${slug}.md`, `missing feature doc — ${detail}`);
  }

  // ---------------------------------------------------------------- check 3
  /** (file,target) pairs already reported as dangling, so check 5 does not repeat them */
  const reportedLinks = new Set();
  const listedSlugs = new Set();

  if (presentRootDocs.has('FEATURES.md')) {
    const featuresMd = readText(join(root, 'FEATURES.md')) ?? '';
    const lines = stripFences(featuresMd).split('\n');

    lines.forEach((rawLine, index) => {
      const lineNo = index + 1;
      if (!/^-\s*\*\*\[/.test(rawLine)) return;

      const strict = rawLine.match(/^- \*\*\[([^\]]+)\]\((features\/[^)]+)\)\*\*/);
      if (!strict) {
        add(
          3,
          'malformed-features-entry',
          'FEATURES.md',
          `line ${lineNo}: entry does not match "- **[<slug>](features/<slug>/<slug>.md)**"`,
          lineNo,
        );
        return;
      }

      const [, label, target] = strict;
      const shape = target.match(/^features\/([^/]+)\/([^/]+)\.md$/);
      if (!shape) {
        add(
          3,
          'malformed-features-entry',
          'FEATURES.md',
          `line ${lineNo}: link "${target}" is not features/<slug>/<slug>.md`,
          lineNo,
        );
        return;
      }

      const [, dirSlug, fileSlug] = shape;
      if (label !== dirSlug || label !== fileSlug) {
        add(
          3,
          'features-entry-slug-mismatch',
          'FEATURES.md',
          `line ${lineNo}: slug differs across label/directory/filename (${label} / ${dirSlug} / ${fileSlug})`,
          lineNo,
        );
      }
      listedSlugs.add(label);
      listedSlugs.add(dirSlug);

      if (!existsSync(join(root, target))) {
        add(3, 'dangling-features-link', 'FEATURES.md', `line ${lineNo}: link "${target}" does not resolve`, lineNo);
        reportedLinks.add(`FEATURES.md\u0000${target}`);
      }
    });

    for (const slug of featureSlugs) {
      if (!listedSlugs.has(slug)) {
        add(3, 'orphan-feature', `features/${slug}/`, 'feature directory is not listed in FEATURES.md');
      }
    }
  }

  // ---------------------------------------------------------------- check 4
  for (const docRel of featureDocs.values()) {
    const text = readText(join(root, docRel));
    if (text === null) {
      add(4, 'unreadable-feature-doc', docRel, 'feature doc could not be read');
      continue;
    }
    const body = stripFences(text);

    if (!/^#[ \t]+\S/m.test(body)) {
      add(4, 'missing-h1', docRel, 'no H1 title');
    }

    const statusLine = body.match(/^\*\*Status:\*\*[ \t]*(.*)$/m);
    if (!statusLine) {
      add(4, 'missing-status', docRel, 'no "**Status:**" line');
    } else {
      const value = statusLine[1].trim();
      if (!STATUS_VALUES.includes(value)) {
        add(
          4,
          'invalid-status',
          docRel,
          `**Status:** is "${value || '(empty)'}" — expected one of ${STATUS_VALUES.join(', ')}`,
        );
      }
    }

    const h2s = new Set();
    for (const match of body.matchAll(/^##[ \t]+(.+?)[ \t]*$/gm)) h2s.add(match[1]);
    const missing = REQUIRED_H2.filter((heading) => !h2s.has(heading));
    if (missing.length) {
      add(4, 'missing-headings', docRel, `missing H2 heading(s): ${missing.map((h) => `## ${h}`).join(', ')}`);
    }
  }

  // ---------------------------------------------------------------- check 5
  const linkedFiles = [...ROOT_DOCS.filter((doc) => presentRootDocs.has(doc)), ...featureDocs.values()];
  for (const fileRel of linkedFiles) {
    const text = readText(join(root, fileRel));
    if (text === null) continue;
    const fileDir = join(root, fileRel, '..');
    for (const { target, line } of extractRelativeLinks(text)) {
      if (reportedLinks.has(`${fileRel}\u0000${target}`)) continue;
      const cleaned = resolveLinkTarget(target);
      if (cleaned === null) continue;
      const abs = cleaned.startsWith('/') ? join(root, cleaned) : resolve(fileDir, cleaned);
      if (!existsSync(abs)) {
        add(5, 'broken-relative-link', fileRel, `line ${line}: relative link "${target}" does not resolve`, line);
      }
    }
  }

  // ---------------------------------------------------------------- check 6
  if (presentRootDocs.has('CHANGELOG.md')) {
    const codeDate = newestCodeCommitDate(root, loadTriggerPaths(root));
    if (codeDate) {
      const changelog = stripFences(readText(join(root, 'CHANGELOG.md')) ?? '');
      const dates = [...changelog.matchAll(/^##[ \t]+(\d{4}-\d{2}-\d{2})[ \t]*$/gm)].map((m) => m[1]).sort();
      const newest = dates.length ? dates[dates.length - 1] : null;
      if (!newest) {
        add(
          6,
          'changelog-behind-code',
          'CHANGELOG.md',
          `no "## YYYY-MM-DD" entry, but code changed on ${codeDate}`,
        );
      } else if (newest < codeDate) {
        add(
          6,
          'changelog-behind-code',
          'CHANGELOG.md',
          `newest entry is ${newest}, but code last changed on ${codeDate}`,
        );
      }
    }
  }

  return { findings, featureCount: featureDocs.size };
}

/**
 * Date of the newest commit touching a code path, or null when the question
 * cannot be answered (no git, no repo, no commits, no matching history).
 */
function newestCodeCommitDate(root, triggerPaths) {
  let result;
  try {
    result = spawnSync('git', ['log', '-1', '--format=%cs', '--', ...triggerPaths], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
    });
  } catch {
    return null;
  }
  if (!result || result.error || result.status !== 0) return null;
  const date = (result.stdout || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${USAGE}\n`);
    process.exit(1);
  }

  if (opts.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  }

  const root = resolve(opts.root);
  if (!isDirectory(root)) {
    process.stderr.write(`livingdocs lint: not a directory: ${root}\n`);
    process.exit(1);
  }

  const { findings, featureCount } = run(root);
  const ok = findings.length === 0;

  if (opts.json) {
    const byCheck = {};
    for (const finding of findings) byCheck[finding.check] = (byCheck[finding.check] ?? 0) + 1;
    process.stdout.write(
      `${JSON.stringify({ ok, root, featureCount, count: findings.length, byCheck, findings }, null, 2)}\n`,
    );
  } else if (ok) {
    process.stdout.write(`livingdocs lint: clean — ${featureCount} feature doc(s) checked\n`);
  } else {
    for (const finding of findings) {
      process.stdout.write(`${finding.file}: ${finding.message}  [check ${finding.check}: ${CHECK_TITLES[finding.check]}]\n`);
    }
    process.stdout.write(`\nlivingdocs lint: ${findings.length} finding(s)\n`);
  }

  process.exit(ok ? 0 : 1);
}

main();
