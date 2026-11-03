#!/usr/bin/env bash
# 認証情報のファイルを、直接読み書きしたり持ち出したりするのを防ぐ。
# 例外のないルールなので、CLAUDE.md ではなく hook で強制する。
# 注意: シェルの書き方は無数にあるため、Bash の検査は網羅できない。最終的な守りは、Secrets を AI の環境に置かないこと。
set -euo pipefail

INPUT="$(cat)"
TOOL_NAME="$(jq -r '.tool_name' <<<"$INPUT")"

# Read / Write / Edit に使う、ファイルパスの判定。
# .env / .env.local / .dev.vars / secrets/ / *.pem / 秘密鍵。ただし *.example は読んでよい。
FILE_PATTERN='(^|/)\.env(\.[^/]*)?$|(^|/)\.dev\.vars(\.[^/]*)?$|(^|/)secrets/|\.pem$|(^|/)id_(rsa|ed25519)$'

# Bash のコマンド文字列の判定。パスの前に来うる文字(空白、/、引用符、=、:、括弧、リダイレクト)を境界にして、
# 引用符つき(cat ".env")や、代入・リダイレクトの中でも見つける。
BEFORE="(^|[[:space:]/\"'=:(<>@])"
AFTER="([^A-Za-z0-9_.-]|\$)"
CMD_PATTERN="${BEFORE}(\.env|\.dev\.vars)(\.[A-Za-z0-9_.-]+)?${AFTER}|${BEFORE}secrets/|\.pem${AFTER}|${BEFORE}id_(rsa|ed25519)${AFTER}"
READERS='(cat|less|more|head|tail|tac|nl|strings|jq|grep|rg|sed|awk|cp|mv|scp|rsync|curl|wget|base64|openssl|gpg|python|python3|node|xxd|od|source|tar|zip|vim|vi|nano|open|ssh|ssh-add)'

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
    if [[ "$stripped" =~ $CMD_PATTERN && "$stripped" =~ (^|[^A-Za-z0-9_-])${READERS}([^A-Za-z0-9_-]|$) ]]; then
      deny "認証情報を直接読み取り・複製・送信するコマンドは実行できません。"
    fi
    ;;
esac
exit 0
