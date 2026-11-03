#!/usr/bin/env bash
# 日常の検査(factory.json の fast)が通るまで、終了させない(終了コード2で作業に戻す)。
# ハーネスの上限(連続8回)で自動的に解除される。
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
cd "$root"
[[ -f factory.json ]] || exit 0
stack="$(jq -r '.stack // empty' factory.json)"
[[ -z "$stack" ]] && exit 0                                   # スタック未選択なら、検査するものがない
marker="$(jq -r '.installedMarker // empty' factory.json)"
[[ -n "$marker" && ! -e "$marker" ]] && exit 0                # 依存が未導入なら、素通りさせる
if ! node scripts/factory-run.mjs fast 1>&2; then
  echo "検査が通っていません。直してから終了してください。" >&2
  exit 2
fi
exit 0
