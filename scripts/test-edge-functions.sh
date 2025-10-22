#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/supabase/.env.test"
LOG_DIR="${TMPDIR:-/tmp}/supabase-functions"
mkdir -p "$LOG_DIR"

SUPABASE_BIN=${SUPABASE_BIN:-"npx --yes supabase@latest"}
read -r -a SUPABASE_CMD <<< "$SUPABASE_BIN"

pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

wait_for_ready() {
  local url=$1
  for _ in $(seq 1 15); do
    if curl -s -o /dev/null --connect-timeout 1 "$url"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

invoke_function() {
  local name=$1
  local payload=$2

  local log_file="$LOG_DIR/${name}.log"
  "${SUPABASE_CMD[@]}" functions serve "$name" --env-file "$ENV_FILE" --no-verify-jwt --workdir "$ROOT_DIR" \
    >"$log_file" 2>&1 &
  local pid=$!
  pids=("$pid")

  local base_url="http://127.0.0.1:54321/functions/v1/${name}"

  if ! wait_for_ready "$base_url"; then
    echo "Function $name failed to start" >&2
    tail -n 20 "$log_file" >&2 || true
    return 1
  fi

  local response
  response=$(curl -s -X POST -H 'Content-Type: application/json' --data "$payload" \
    "$base_url")

  python - "$response" "$name" <<'PY'
import json, sys
response = json.loads(sys.argv[1])
name = sys.argv[2]
if response.get("success") is not True:
    raise SystemExit(f"{name} did not return success=true")
if "data" not in response:
    raise SystemExit(f"{name} missing data field")
if name == "generate-task-report":
    url = response["data"].get("url")
    if not (isinstance(url, str) and url.startswith("https://example.local/storage/task-attachments/")):
        raise SystemExit("unexpected public URL for report")
elif name == "sync-release-log":
    status = response["data"].get("status")
    if status not in {"queued", "synced"}:
        raise SystemExit("unexpected status for sync function")
else:
    raise SystemExit("Unknown function name")
PY

  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  pids=()
}

invoke_function "generate-task-report" '{"rows":[["Coluna A","Coluna B"],["Item 1","Item 2"]]}'
invoke_function "sync-release-log" '{"version":"011","target":"make.com"}'

echo "Edge function smoke tests passed."
