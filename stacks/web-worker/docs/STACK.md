# スタック: web-worker

React + Vite の画面と、Cloudflare Worker(本人確認、API、静的ファイルの配信)。Cloudflare Access で、本人しか開けない。最初は「準備中」のページだけが出る。

## 構成

| 場所 | 内容 |
|---|---|
| `src/` | 画面(React) |
| `worker/` | Worker。`index.ts` が本人確認と配信、`api.ts` にAPIを足す、`accessGate.ts` が Access の署名の検証 |
| `tests/unit` | 単体テスト |
| `tests/acceptance` | 完成の判定(保護パス)。例: `health.acceptance.test.ts` |
| `tests/e2e` | ブラウザ(PC幅とスマホ幅) |
| `wrangler.jsonc` | Worker の設定(名前、`APP_ORIGIN` は置き換える) |

## コマンド

- 日常: `npm run check:fast`(型、ESLint、単体テスト)
- 1つのテストファイル: `npx vitest run tests/unit/worker.test.ts`
- 受け入れテストだけ: `npm run test:acceptance`
- 公開前・Worker/認証/設定の変更時: `npm run security:tools` のあと `npm run security:check`
- ブラウザ: `npm run test:e2e`(ブラウザの版が合わないときは `PW_CHROMIUM_PATH` に Chromium の実行ファイルを指定)

## 注意

- Worker は、Access の設定が不完全だと、必ず閉じる(503)。この挙動を弱めない。
- 新しい API は `worker/api.ts` の `routes` に足す。本人確認の前には何も返さない。
- CSP は厳しめ(`worker/index.ts`)。外部のスクリプト・画像・フォントを足すときは、理由を PR に書く。
- Node 24 と npm 11 を使う。npm 10.x では `npm install` が `Cannot read properties of null (reading 'edgesOut')` で失敗することがある(vitest の peer 依存の解決で npm 側に不具合がある)。npm 10 しかない環境では `npx -y npm@11 install` を使う。
- `package.json` の `overrides.minimatch` は、`npm audit` が報告する脆弱性(開発用の ESLint が使う)を避けるための固定。上流の ESLint が直ったら外す。
- `npm ci --ignore-scripts` を使う。依存のインストールスクリプトは実行しない。

## セットアップ(人間の作業)

AIは行わない。値はAIに渡さない。

1. Cloudflare にプロジェクト(Worker)を用意する。名前を `wrangler.jsonc` の `name` に、公開先のホストを `APP_ORIGIN` に書く。
2. Cloudflare Access で、このホストを保護するアプリケーションを作り、自分のメールアドレスだけを許可する。
3. 値を設定する。
   - 公開してよい値(`wrangler.jsonc` の `vars`): `ACCESS_TEAM_DOMAIN`、`ACCESS_AUD`
   - Secret: `ACCESS_ALLOWED_EMAIL`
4. 配備の前に、`security` を通す。

`APP_ORIGIN` が `REPLACE_WITH_...` のままだと、Worker は何も返さない(意図した動き)。

## 確認

- [ ] 本人以外のブラウザ(ログインしていない状態)で、URL を開いても何も見えない
- [ ] 本人のログイン後に、「準備中です」が表示される
- [ ] スマホで、同じ画面が開く
