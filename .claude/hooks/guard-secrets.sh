#!/usr/bin/env bash
# 認証情報のファイルを、直接読み書きしたり持ち出したりするのを防ぐ。
# 例外のないルールなので、CLAUDE.md ではなく hook で強制する。
set -euo pipefail

INPUT="$(cat)"
TOOL_NAME="$(jq -r '.tool_name' <<<"$INPUT")"
# .env / .env.local / .dev.vars など。ただし *.example は読んでよい。
FILE_PATTERN='(^|/)\.env(\.[^/]*)?$|(^|/)\.dev\.vars(\.[^/]*)?$|(^|/)secrets/|\.pem$|(^|/)id_(rsa|ed25519)$'
CMD_PATTERN='(^|[[:space:]/])\.env([^a-zA-Z0-9_]|$)|(^|[[:space:]/])\.env\.[a-z]+|(^|[[:space:]/])\.dev\.vars([^a-zA-Z0-9_.]|$)|(^|[[:space:]/])\.dev\.vars\.[a-z]+'
READERS='(cat|less|more|head|tail|jq|grep|sed|awk|cp|mv|scp|curl|base64|python|node|xxd|od|source)'

deny() {
  jq -n --arg reason "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}
is_example() { [[ "$1" == *.example ]]; }

case "$TOOL_NAME" in
  Read|Write|Edit|MultiEdit)
    path="$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")"
    if [[ -n "$path" && "$path" =~ $FILE_PATTERN ]] && ! is_example "$path"; then
      deny "認証情報を含むファイルは直接扱えません。値は人間が設定します。"
    fi
    ;;
  Bash)
    command="$(jq -r '.tool_input.command // empty' <<<"$INPUT")"
    stripped="${command//.env.example/}"
    stripped="${stripped//.dev.vars.example/}"
    if [[ "$stripped" =~ $CMD_PATTERN && "$stripped" =~ $READERS ]]; then
      deny "認証情報を直接読み取り・複製・送信するコマンドは実行できません。"
    fi
    ;;
esac
exit 0
