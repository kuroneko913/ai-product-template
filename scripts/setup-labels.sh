#!/usr/bin/env bash
# テンプレートからリポジトリを作ったあとに、人間が1回だけ実行する(gh のログインが必要)。
set -euo pipefail

create() { gh label create "$1" --color "$2" --description "$3" --force; }

create proposed          c5def5 "AIが起票した。人間が ready を付けるまで着手しない"
create ready             0e8a16 "人間が確認済み。受け入れ条件は変更不可"
create needs-answer      fbca04 "人間の返事待ち(質問と既定案はコメントに書いてある)"
create blocked           d93f0b "受け入れ条件の矛盾など。人間に戻した"
create "blocked:auth"    d93f0b "ログインなど環境の問題で止まった"
create stalled           b60205 "AIが止まっている(原因はAI側)"
create "priority:now"    e11d21 "次に空いた枠に最優先で入れる"
create "tier:1"          5319e7 "いま困っていることを直す"
create "tier:2"          5319e7 "できることが増える"
create "tier:3"          5319e7 "使い心地の改善"
create "tier:4"          5319e7 "リファクタリング"
create feedback          1d76db "使いながら出た改善点"
create protected-change  000000 "保護パスの変更を人間が承認した(人間だけが付ける)"
