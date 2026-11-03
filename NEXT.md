# 現状と次の一手

## いまどこか(v0.1)

2層に分かれている。共通の土台(言語・技術に依存しない)と、スタック(`stacks/web-worker` が1つ)。

- 共通の土台: AI への規則(AGENTS.md、CLAUDE.md)、標準の入口(`factory.json`、`scripts/factory-run.mjs`)、スタックの展開(`scripts/init-stack.mjs`)、保護パスの判定とガード(hook と CI)、Gitleaks、issue / PR のテンプレート、CODEOWNERS、ラベル作成、`.claude/`(拒否ルール、hook、reviewer、implement-issue)。
- `web-worker`: 準備中ページ、本人限定の Cloudflare Worker、検査、e2e。

### ローカルの環境(Node 22 / npm 10 と 11)で確認したこと

- 共通の仕組みの自己検査 15件(`node --test`)通過: 保護パスの判定、標準の入口の実行、スタックの展開(上書きの拒否、1回だけ、`.gitignore` の追記)
- スタック未選択のまま標準の入口を呼ぶと、失敗する(意図した動き)
- 一時コピーでスタックを展開し、次が通った: `install`、`fast`(型、ESLint、単体14件)、`acceptance`(2件)、`security`(監査、ビルド、Gitleaks、自己テスト、Worker の dry-run)、e2e(PC幅とスマホ幅。ブラウザは `PW_CHROMIUM_PATH` で指定)
- hook(秘密、保護パス、Stop)の動作確認、PR を模した保護パスのガードの動作確認
- 「本人確認を外す」変更を入れると、単体テストが落ちること

### GitHub Actions 上で確認できたこと(2026-11-03)

- `Template self-test`(`selftest` ジョブ。web-worker を展開して `install`、`fast`、`acceptance`、`security`、`e2e` を実行。e2e は `playwright install --with-deps` を含む)が、`main` への push と、Dependabot の PR(#1)の両方で成功
- `Core / scripts`(自己検査15件)が成功
- 保護パスのガード(`Guard / protected paths`)が、`.github/**` を変更する PR(Dependabot の #1)で、期待どおり失敗した

### 製品側での確認と、見つかった不具合(2026-11-03、factory-console に組み込んで)

- 製品のリポジトリ(`is_template` が false)の GitHub Actions で、`Check / fast`、`Check / acceptance`、`Security`、`E2E`、`Core / scripts` が成功。`Template self-test` は skipped(設計どおり)。ガードは、ラベルがないと失敗(設計どおり)
- Codex のレビューで、次の2件(P1)が見つかり、直した(失敗するテストを先に書いた。共通の自己検査は15件から28件に)
  - 保護ファイルを、保護されていない場所へ移動すると、ガードが見逃す(`git diff` の移動の検出で、移動先しか出なかった)。`--no-renames` で直した
  - 日本語・タブ・引用符を含む保護ファイル名を、ガードが見逃す(`git diff --name-only` は、そうした名前を引用符つきで出力する)。`-z`(NUL 区切り)で直した。共通の自己検査は32件
  - `guard-secrets.sh` が、Bash での `cat ".env"`、`secrets/`、`*.pem`、秘密鍵の読み取りを見逃す。境界の文字に引用符などを加え、パスの範囲を Read / Edit と揃えた。シェルの書き方は無数にあるため、Bash の検査は網羅できない(最終的な守りは、Secrets を AI の環境に置かないこと)

### 確認できていないこと

- 製品のリポジトリでの `ci.yml` の `suite`(スタックを展開した状態での実行)。`Template self-test` は、同じコマンドを順に実行するだけで、`ci.yml` 自体のマトリクスは通っていない
- Cloudflare への実際の配備と Access の通し確認
- Claude Code の中で、hook・skill・サブエージェントが期待どおり動くか(設定は書いたが、実際のセッションでは試していない)
- `web-worker` 以外のスタック。共通の土台が、別の言語でも成り立つかは、実際に2つ目を作るまで分からない
- このテンプレートは、テストと実装を同時に書いた(TDD の Red を先に確認したものではない)

## 次にやること

1. [ ] テンプレートから実際にリポジトリを作り、Actions を通す(`Template self-test` と、展開後の `checks`)
2. [ ] Claude Code のクラウドセッションで、`ready` の issue を1件実装させ、hook・skill・reviewer が期待どおり動くか確かめる
3. [ ] 2つ目のスタックを作る(例: AI が動き続ける仕組み向けの Python。共通の土台の抽象が正しいかの確認になる)
4. [ ] リリースゲート(公開への切り替えの強制)を、hitomazu から汎用化して取り込む
5. [ ] 検査を、コピーではなく共通のワークフローから呼び出す形にする(更新が作成済みのリポジトリへ届くように)
6. [ ] 利用者のログイン(Firebase など)を、公開するアプリ向けの追加部品として用意する
