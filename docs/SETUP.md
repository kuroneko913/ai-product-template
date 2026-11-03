# セットアップ(テンプレートから作ったあとの、人間の作業)

AIは、ここに書いてある作業を行わない。必要になったら、手順とリンクを、依頼として出す。スタック固有の作業は、`docs/STACK.md`。

## 1. GitHub

1. リポジトリを **Private** で作る(Use this template)。
2. スタックを選ぶ(`node scripts/init-stack.mjs <名前>`)。依存を入れて、`node scripts/factory-run.mjs fast` が通ることを確かめ、コミットする。
3. Actions を有効にする。
4. ラベルを作る(`gh` にログインしてから1回だけ): `bash scripts/setup-labels.sh`
5. ブランチ保護(`main`):
   - PR を必須にする。
   - 必須のチェックに、**`checks`** の1本だけを指定する(`.github/workflows/ci.yml` の最後のジョブ)。
   - **コードオーナーのレビューを必須**にする(CODEOWNERS が保護パスを守る)。
   - 管理者もルールに従うようにする。force push を禁止する。
6. `.github/CODEOWNERS` の `@kuroneko913` を、自分のアカウントに合わせる。
7. 以降、マージは人間が行う。

## 2. 確認

- [ ] `node scripts/factory-run.mjs fast` と `security` が通る
- [ ] PR を1つ作り、`checks` が緑になる
- [ ] PR で、保護パス(たとえば `.github/CODEOWNERS`)を変更すると、`Guard / protected paths` が失敗する
- [ ] スタック固有の確認(`docs/STACK.md`)
