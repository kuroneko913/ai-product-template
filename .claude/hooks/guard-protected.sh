#!/usr/bin/env bash
# 実装するエージェントが、保護パス(受け入れテスト、CI、検査、hook、設定)を変更するのを防ぐ。
# 仕様を書く役(FACTORY_ROLE=spec)のときだけ、許可する。
# 注意: Bash 経由の書き換え(sed -i など)は止められない。最終的な強制は CI の guard:protected と CODEOWNERS。
set -euo pipefail

INPUT="$(cat)"
[[ "${FACTORY_ROLE:-}" == "spec" ]] && exit 0
path="$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")"
[[ -z "$path" ]] && exit 0

root="${CLAUDE_PROJECT_DIR:-$PWD}"
if (cd "$root" && node scripts/is-protected.mjs "$path") 2>/dev/null; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"このファイルは保護されています(受け入れテスト・CI・検査・設定など)。変更が必要なら、issue に理由を書いて人間に依頼してください。"}}'
fi
exit 0
