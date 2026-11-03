# product-template

AIエージェントに、新しいプロダクトの開発を任せるための、テンプレートリポジトリ。Webアプリに限らない。

中身は2層になっている。

- **共通の土台(このリポジトリの直下)。** 言語・技術に依存しない。AIへの規則、保護、検査の入口、issue 駆動の流れ。
- **スタック(`stacks/`)。** 技術ごとの、すぐ動く最小の型。いまあるのは `web-worker`(React + Cloudflare Worker、本人限定)。これから作るプロダクトに合うものを1つ選んで展開する。

## 共通の土台が決めること

- **AIが勝手にできないことが、仕組みで決まっている。** Secrets を読む、受け入れテストや CI を書き換える、マージする、公開する、は止まる(hook、CI のガード、CODEOWNERS)。
- **標準の入口が決まっている。** `factory.json` に、`install`、`fast`、`security`、`acceptance`、`e2e` のコマンドを書く。hook、CI、AIは、ここに書かれたコマンドだけを呼ぶ。
- **検査が通らないと、終われない。** 失敗や前提不足は、合格にならない(Stop hook、CI)。
- **issue 駆動。** 人間が `ready` を付けた issue だけを実装する。受け入れ条件は、付けたあと変更できない。
- **秘密情報の検査。** Gitleaks(固定版)で、履歴・作業ファイル・Git のインデックスを検査する。

## 使う

1. GitHub で、このリポジトリから新しいリポジトリを作る(Use this template)。名前と公開範囲(Private)を決める。
2. スタックを選ぶ: `node scripts/init-stack.mjs web-worker`(候補は `stacks/` にある)。
3. [`docs/SETUP.md`](docs/SETUP.md) の人間の作業を行う(GitHub の設定、ラベル、ブランチ保護)。スタック固有の作業は、展開された `docs/STACK.md` にある。
4. issue を作り、内容を確認して `ready` を付ける。AI が実装して PR を出す。流れは [`docs/WORKFLOW.md`](docs/WORKFLOW.md)。

スタックを選ばないままだと、CI は失敗する(意図した動き)。テンプレート自身(Template repository に設定したリポジトリ)では、この検査は動かさず、代わりに `ci.yml` の `selftest` ジョブが、各スタックを展開して通しで検査する(`checks` の判定に含まれる)。

## 構成

| 場所 | 内容 |
|---|---|
| `factory.json` | 標準の入口(コマンドの対応表)。スタックを選ぶと置き換わる |
| `scripts/` | 共通の仕組み: 標準の入口の実行、スタックの展開、保護パスの判定とガード、Gitleaks、ラベル作成。`scripts/tests/` に自己検査 |
| `.claude/` | AI用の設定: 拒否ルール、hook、レビュー用サブエージェント、実装の手順(skill) |
| `.github/` | CI、issue と PR のテンプレート、CODEOWNERS、dependabot |
| `AGENTS.md`、`CLAUDE.md` | エージェント向けのルール |
| `stacks/<名前>/` | スタックの型。展開すると直下に置かれ、`stacks/` は消える |

## 新しいスタックを足す

`stacks/<名前>/` に、そのまま直下へ置けるファイル一式を作る。最低限、次が要る。

- `factory.json`: `stack` の名前と、`commands`(`install`、`fast`、`security`、`acceptance`。ブラウザなどがあれば `e2e`)。`installedMarker`(依存が入っていれば存在するパス)があると、依存が未導入のときに Stop hook が素通りする。
- `security.config.json`: `artifactDirs`(ビルド成果物の場所。なければ `[]`)など。
- `docs/STACK.md`: そのスタックの注意とセットアップ。
- `.github/workflows/ci.yml` の `selftest` ジョブの matrix に、スタック名を足す(テンプレート自身の検査)。

標準の入口の `security` は、必ず、秘密情報の検査(`node scripts/secret-scan.mjs`)と、依存の脆弱性の検査を含める。

## できていないこと

- 本人限定から、公開への切り替え(リリースゲート)の機械的な強制。手順は [`docs/RELEASE.md`](docs/RELEASE.md)。
- `web-worker` 以外のスタック(AI が動き続ける仕組み、CLI、Python など)。
- このテンプレートの更新を、作成済みのリポジトリへ届ける仕組み。テンプレートは、作った時点のコピー。
- GitHub Actions 上での実行と、実際の Cloudflare での通し確認。
