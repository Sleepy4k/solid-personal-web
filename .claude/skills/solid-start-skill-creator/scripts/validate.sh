#!/usr/bin/env bash
# Run the skill validator. Usable manually or as a pre-commit hook.
#
#   ./validate.sh                 # validate all stacks (fails on any issue)
#   ./validate.sh express         # validate one stack
#   ./validate.sh --report        # summarise slop counts, never fail
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATE_PY="${SCRIPT_DIR}/../tools/validate.py"

PY="$(command -v python3 || command -v python || true)"
if [ -z "${PY}" ]; then
  echo "python not found on PATH" >&2
  exit 1
fi

args=()
report=0
for a in "$@"; do
  case "$a" in
    --report) report=1 ;;
    --*) args+=("$a") ;;
    *) args+=(--stack "$a") ;;
  esac
done
if [ ${#args[@]} -eq 0 ]; then
  args+=(--all)
fi
if [ "${report}" -eq 1 ]; then
  args+=(--report)
fi

exec "${PY}" "${VALIDATE_PY}" "${args[@]}"
