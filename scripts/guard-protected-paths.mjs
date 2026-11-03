// PRが保護パスを変更していたら、CIを落とす。人間が `protected-change` ラベルを付けたときだけ通す。
// ラベルを付けるのは人間の作業(AGENTS.md)。ラベルがあっても、CODEOWNERSの人間レビューは必要。
import { spawnSync } from "node:child_process";
import { findProtected, loadPatterns } from "./lib/protected.mjs";

const base = process.env.BASE_SHA;
if (!base) {
  console.log("BASE_SHA が未設定です(プルリクエストではありません)。検査を省略します。");
  process.exit(0);
}
if (!/^[0-9a-f]{40}$/.test(base)) throw new Error("BASE_SHA が不正です");

// --no-renames: 移動は「移動元の削除」と「移動先の追加」の両方として出す(移動元だけ保護パスでも、見逃さない)。
const diff = spawnSync("git", ["diff", "--name-only", "--no-renames", `${base}...HEAD`], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
if (diff.status !== 0) throw new Error("git diff に失敗しました");

const changed = diff.stdout.split("\n").filter(Boolean);
const hits = findProtected(changed, loadPatterns());
if (hits.length === 0) {
  console.log("保護パスの変更はありません。");
  process.exit(0);
}
console.log("保護パスの変更があります:\n" + hits.map((h) => `  - ${h}`).join("\n"));
if (process.env.PROTECTED_CHANGE_LABEL === "true") {
  console.log("`protected-change` ラベルがあるため、通します。CODEOWNERSのレビューが必要です。");
  process.exit(0);
}
console.error(
  "実装の変更に、保護パスを含めることはできません。人間が必要と判断した場合だけ、`protected-change` ラベルを付けます。",
);
process.exit(1);
