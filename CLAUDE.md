@AGENTS.md
@docs/STACK.md

# コマンド(標準の入口)
- 依存の導入: `node scripts/factory-run.mjs install`
- 日常の検査: `node scripts/factory-run.mjs fast`
- 受け入れテスト: `node scripts/factory-run.mjs acceptance`
- 公開前・認証/設定/外部との接続の変更時: `node scripts/factory-run.mjs security`
- ブラウザなどでの確認(あれば): `node scripts/factory-run.mjs e2e`
- 共通の仕組みの自己検査: `node --test "scripts/tests/*.test.mjs"`
- 実際のコマンドは `factory.json`。1つのテストだけ動かす方法などは、`docs/STACK.md`。

# 注意
- スタックが未選択(`factory.json` の `stack` が null)なら、実装を始めず、人間に伝える。
- 保護パス(`protected-paths.json`)は変更しない。必要なら issue に理由を書いて、人間に依頼する。
- 同じ指摘を2回受けたら、ここに1行足す。
