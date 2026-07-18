#!/usr/bin/env bash
set -Eeuo pipefail

readonly deploy_directory="/home/ubuntu/apps/game-platform"
readonly image_repository="yuo-game-platform"
readonly maximum_artifact_bytes=$((512 * 1024 * 1024))
readonly minimum_artifact_bytes=$((1 * 1024 * 1024))
readonly maximum_unpacked_bytes=$((2 * 1024 * 1024 * 1024))
readonly retained_github_images=5

log() {
  printf '[yuo-deploy] %s\n' "$*"
}

fail() {
  printf '[yuo-deploy] 错误：%s\n' "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "部署脚本必须以 root 运行"
[[ "$#" -eq 2 ]] || fail "参数数量无效"

readonly commit_sha="$1"
readonly expected_artifact_sha256="$2"
[[ "${commit_sha}" =~ ^[0-9a-f]{40}$ ]] || fail "提交 SHA 无效"
[[ "${expected_artifact_sha256}" =~ ^[0-9a-f]{64}$ ]] || fail "镜像摘要无效"

readonly image_tag="sha-${commit_sha}"
readonly image_reference="${image_repository}:${image_tag}"

exec 9> /run/lock/yuo-game-platform-deploy.lock
flock -n 9 || fail "已有部署正在执行"

umask 077
artifact="$(mktemp "/var/tmp/yuo-game-platform-${commit_sha}.XXXXXX.tar.gz")"
next_environment=""
image_probe_container=""
image_probe_directory=""
backup_directory=""
rollback_required=0

rollback() {
  [[ -n "${backup_directory}" && -f "${backup_directory}/.env" ]] || return 0
  log "恢复上一镜像配置"
  install -o ubuntu -g ubuntu -m 0600 "${backup_directory}/.env" "${deploy_directory}/.env"
  (
    cd "${deploy_directory}"
    docker compose up -d --no-build --wait --wait-timeout 180
  ) || log "警告：自动回滚启动失败，需要人工处理"
}

cleanup() {
  local status=$?
  trap - EXIT
  if [[ "${status}" -ne 0 && "${rollback_required}" -eq 1 ]]; then
    rollback
  fi
  [[ -z "${image_probe_container}" ]] || docker rm -f "${image_probe_container}" > /dev/null 2>&1 || true
  [[ -z "${image_probe_directory}" ]] || rm -rf "${image_probe_directory}"
  [[ -z "${next_environment}" ]] || rm -f "${next_environment}"
  rm -f "${artifact}"
  exit "${status}"
}
trap cleanup EXIT

log "接收提交 ${commit_sha} 的镜像"
head -c "$((maximum_artifact_bytes + 1))" > "${artifact}"
readonly artifact_bytes="$(stat -c '%s' "${artifact}")"
(( artifact_bytes >= minimum_artifact_bytes )) || fail "镜像文件过小"
(( artifact_bytes <= maximum_artifact_bytes )) || fail "镜像文件超过 512 MiB 上限"

readonly actual_artifact_sha256="$(sha256sum "${artifact}" | awk '{print $1}')"
[[ "${actual_artifact_sha256}" == "${expected_artifact_sha256}" ]] || fail "镜像 SHA-256 不一致"
gzip -t "${artifact}"

python3 - "${artifact}" "${image_reference}" "${maximum_unpacked_bytes}" <<'PY'
import json
import pathlib
import sys
import tarfile

artifact, expected_tag, maximum_unpacked_bytes = sys.argv[1:]
with tarfile.open(artifact, mode="r:gz") as archive:
    members = archive.getmembers()
    if sum(member.size for member in members) > int(maximum_unpacked_bytes):
        raise SystemExit("镜像归档解压后超过 2 GiB 上限")
    for member in members:
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or ".." in path.parts:
            raise SystemExit("镜像归档包含非法路径")
    manifest_file = archive.extractfile("manifest.json")
    if manifest_file is None:
        raise SystemExit("镜像归档缺少 manifest.json")
    manifest = json.load(manifest_file)

if len(manifest) != 1 or manifest[0].get("RepoTags") != [expected_tag]:
    raise SystemExit("镜像归档只能包含当前提交的唯一标签")
PY

readonly backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_directory="${deploy_directory}/backups/github-${backup_stamp}-${commit_sha:0:12}"
install -d -o ubuntu -g ubuntu -m 0700 "${backup_directory}"
install -o ubuntu -g ubuntu -m 0600 "${deploy_directory}/.env" "${backup_directory}/.env"
install -o ubuntu -g ubuntu -m 0600 "${deploy_directory}/compose.yml" "${backup_directory}/compose.yml"

docker inspect --format '{{.Image}}' game-platform-platform-1 > "${backup_directory}/previous-image-id.txt"
docker exec game-platform-postgres-1 \
  pg_dump -U game_platform -d game_platform --format=custom > "${backup_directory}/platform.dump"

if docker exec game-platform-life-commons-1 test -f /app/data/life/world.json.gz; then
  docker cp game-platform-life-commons-1:/app/data/life/world.json.gz \
    "${backup_directory}/life-world.json.gz"
  gzip -t "${backup_directory}/life-world.json.gz"
fi
if docker exec game-platform-neon-snake-arena-1 test -f /app/data/snake/profiles.json.gz; then
  docker cp game-platform-neon-snake-arena-1:/app/data/snake/profiles.json.gz \
    "${backup_directory}/snake-profiles.json.gz"
  gzip -t "${backup_directory}/snake-profiles.json.gz"
fi
chown -R ubuntu:ubuntu "${backup_directory}"
chmod 0600 "${backup_directory}"/* "${backup_directory}"/.[!.]* 2>/dev/null || true

log "加载并校验 ${image_reference}"
gzip -dc "${artifact}" | docker load > /dev/null
readonly image_platform="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "${image_reference}")"
readonly image_user="$(docker image inspect --format '{{.Config.User}}' "${image_reference}")"
readonly image_volumes="$(docker image inspect --format '{{json .Config.Volumes}}' "${image_reference}")"
[[ "${image_platform}" == "linux/amd64" ]] || fail "镜像平台必须是 linux/amd64"
[[ "${image_user}" == "platform" ]] || fail "镜像必须以 platform 用户运行"
[[ "${image_volumes}" == "null" ]] || fail "镜像不得声明额外数据卷"

image_probe_container="$(docker create "${image_reference}")"
image_probe_directory="$(mktemp -d "/var/tmp/yuo-game-platform-probe.XXXXXX")"
docker cp "${image_probe_container}:/etc/passwd" "${image_probe_directory}/passwd" > /dev/null
readonly platform_uid="$(awk -F: '$1 == "platform" { print $3 }' "${image_probe_directory}/passwd")"
[[ "${platform_uid}" =~ ^[0-9]+$ && "${platform_uid}" -ne 0 ]] || fail "platform 用户 UID 无效"
docker rm "${image_probe_container}" > /dev/null
image_probe_container=""
rm -rf "${image_probe_directory}"
image_probe_directory=""

next_environment="$(mktemp "${deploy_directory}/.env.github.XXXXXX")"
if grep -q '^GAME_PLATFORM_IMAGE=' "${deploy_directory}/.env"; then
  sed "s#^GAME_PLATFORM_IMAGE=.*#GAME_PLATFORM_IMAGE=${image_reference}#" \
    "${deploy_directory}/.env" > "${next_environment}"
else
  cp "${deploy_directory}/.env" "${next_environment}"
  printf '\nGAME_PLATFORM_IMAGE=%s\n' "${image_reference}" >> "${next_environment}"
fi
chown ubuntu:ubuntu "${next_environment}"
chmod 0600 "${next_environment}"
mv "${next_environment}" "${deploy_directory}/.env"
next_environment=""
rollback_required=1

log "更新生产容器"
(
  cd "${deploy_directory}"
  docker compose config --quiet
  docker compose up -d --no-build --wait --wait-timeout 180
)

for health_url in \
  http://127.0.0.1:3100/health \
  http://127.0.0.1:3101/health \
  http://127.0.0.1:3102/api/health \
  http://127.0.0.1:3103/health
do
  curl --fail --silent --show-error --max-time 10 "${health_url}" > /dev/null
done

rollback_required=0
log "部署成功：${image_reference}"

mapfile -t removable_tags < <(
  docker image ls "${image_repository}" --format '{{.Tag}}' \
    | grep -E '^sha-[0-9a-f]{40}$' \
    | tail -n "+$((retained_github_images + 1))" \
    || true
)
for old_tag in "${removable_tags[@]}"; do
  docker image rm "${image_repository}:${old_tag}" > /dev/null 2>&1 || true
done
