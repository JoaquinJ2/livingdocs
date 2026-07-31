#!/usr/bin/env bash
# livingdocs stop hook — reminds the agent to run /livingdocs-record when code
# changed but the documentation did not.
#
# Fails open by design: any missing tool, missing repo, missing commit or
# unexpected error emits {} and exits 0. A documentation reminder must never be
# able to block someone's work.

set -u

emit_ok() {
  trap - EXIT
  printf '%s\n' '{}'
  exit 0
}

trap emit_ok EXIT

# Drain the hook JSON on stdin; none of its fields are needed.
cat >/dev/null 2>&1 || true

command -v git >/dev/null 2>&1 || emit_ok
command -v node >/dev/null 2>&1 || emit_ok

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || emit_ok
[ -n "$repo_root" ] || emit_ok
cd "$repo_root" 2>/dev/null || emit_ok

# No baseline to diff against on a repo with no commits.
git rev-parse --verify --quiet HEAD >/dev/null 2>&1 || emit_ok

# livingdocs is not installed here.
if [ ! -f CHANGELOG.md ] && [ ! -d features ]; then
  emit_ok
fi

# Which paths count as code and which count as documentation is repo-specific,
# so it lives in .livingdocs.json next to the docs. Anything wrong with that
# file — absent, unreadable, not JSON, wrong shape — silently leaves these
# defaults in place rather than blocking.
trigger_patterns=$'orchestrator/\nweb/app/\nweb/lib/\nbin/\nplugin/'
satisfying_patterns=$'CHANGELOG.md\nfeatures/'

if [ -f .livingdocs.json ]; then
  config_lines=$(node -e '
const fs = require("node:fs");
const list = (value) =>
  Array.isArray(value)
    ? value.filter((p) => typeof p === "string" && p.trim() !== "" && !p.includes("\n"))
    : [];
let config;
try {
  config = JSON.parse(fs.readFileSync(".livingdocs.json", "utf8"));
} catch {
  process.exit(0);
}
if (!config || typeof config !== "object") process.exit(0);
const trigger = list(config.triggerPaths).map((p) => "T " + p);
const satisfying = list(config.satisfyingPaths).map((p) => "S " + p);
process.stdout.write([...trigger, ...satisfying].join("\n"));
' 2>/dev/null) || config_lines=""

  configured_triggers=""
  configured_satisfying=""
  while IFS= read -r line; do
    case "$line" in
      'T '*) configured_triggers="${configured_triggers}${line#T }"$'\n' ;;
      'S '*) configured_satisfying="${configured_satisfying}${line#S }"$'\n' ;;
    esac
  done <<EOF
$config_lines
EOF

  [ -z "$configured_triggers" ] || trigger_patterns="${configured_triggers%$'\n'}"
  [ -z "$configured_satisfying" ] || satisfying_patterns="${configured_satisfying%$'\n'}"
fi

# A pattern matches a path when it is the path, a directory prefix of it, or the
# same with a trailing slash — so "bin", "bin/" and "CHANGELOG.md" all behave.
matches_any() {
  _path=$1
  _patterns=$2
  while IFS= read -r _pattern; do
    [ -n "$_pattern" ] || continue
    case "$_pattern" in
      */)
        case "$_path" in "$_pattern"*) return 0 ;; esac
        ;;
      *)
        [ "$_path" = "$_pattern" ] && return 0
        case "$_path" in "$_pattern"/*) return 0 ;; esac
        ;;
    esac
  done <<EOF
$_patterns
EOF
  return 1
}

docs_changed=""
code_count=0
shown=""
max_shown=20

# NUL-delimited so paths with spaces, quotes or newlines survive verbatim;
# without -z git quotes them and the prefix match below would miss them.
# Tracked and untracked sets are disjoint, so no de-duplication is needed.
while IFS= read -r -d '' path; do
  [ -n "$path" ] || continue
  if matches_any "$path" "$satisfying_patterns"; then
    docs_changed="yes"
  fi
  if matches_any "$path" "$trigger_patterns"; then
    code_count=$((code_count + 1))
    if [ "$code_count" -le "$max_shown" ]; then
      shown="${shown}- ${path}"$'\n'
    fi
  fi
done < <(
  git diff --name-only -z HEAD 2>/dev/null
  git ls-files -z --others --exclude-standard 2>/dev/null
)

[ "$code_count" -gt 0 ] || emit_ok
[ -z "$docs_changed" ] || emit_ok

shown="${shown%$'\n'}"
if [ "$code_count" -gt "$max_shown" ]; then
  shown="${shown}"$'\n'"- ...and $((code_count - max_shown)) more"
fi

message="Living documentation: code changed since HEAD but neither CHANGELOG.md nor features/ was updated.

Changed code files:
${shown}

Run /livingdocs-record to write the CHANGELOG entry and update the affected feature docs, then finish. If this change genuinely needs no documentation — a pure refactor with no user-visible effect, for example — say so briefly and stop."

json=$(printf '%s' "$message" | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({ followup_message: input }));
});
' 2>/dev/null) || emit_ok

[ -n "$json" ] || emit_ok

trap - EXIT
printf '%s\n' "$json"
exit 0
