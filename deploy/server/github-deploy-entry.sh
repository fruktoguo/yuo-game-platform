#!/usr/bin/env bash
set -euo pipefail

readonly original_command="${SSH_ORIGINAL_COMMAND:-}"

if [[ ! "${original_command}" =~ ^deploy\ ([0-9a-f]{40})\ ([0-9a-f]{64})$ ]]; then
  echo "拒绝执行：部署命令格式无效" >&2
  exit 64
fi

readonly commit_sha="${BASH_REMATCH[1]}"
readonly artifact_sha256="${BASH_REMATCH[2]}"

exec sudo -n /usr/local/sbin/deploy-yuo-game-platform "${commit_sha}" "${artifact_sha256}"
