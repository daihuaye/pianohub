#!/usr/bin/env bash

set -euo pipefail

PORT=${PORT:-8000}
BIND_ADDR=${BIND_ADDR:-127.0.0.1}
LOG_FILE=${LOG_FILE:-/tmp/pianohub-http.log}
PYTHON_BIN=${PYTHON_BIN:-python3}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "Error: ${PYTHON_BIN} not found in PATH" >&2
  exit 1
fi

cd "${PROJECT_ROOT}"

if command -v emcc >/dev/null 2>&1; then
  echo "Building WebAssembly bundle (make emscripten)..."
  make emscripten
else
  echo "Warning: emcc not found; skipping 'make emscripten'." >&2
fi

existing_pids=$(lsof -ti tcp:"${PORT}" || true)
if [[ -n "${existing_pids}" ]]; then
  echo "Stopping existing server on port ${PORT}..."
  xargs -r kill <<<"${existing_pids}"
  sleep 1
fi

echo "Starting server on ${BIND_ADDR}:${PORT} (log: ${LOG_FILE})"

nohup "${PYTHON_BIN}" -m http.server --bind "${BIND_ADDR}" "${PORT}" \
  >"${LOG_FILE}" 2>&1 &

SERVER_PID=$!
echo "Server PID: ${SERVER_PID}"
