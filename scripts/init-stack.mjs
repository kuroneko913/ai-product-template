// スタックを選ぶ: node scripts/init-stack.mjs <名前>
// stacks/<名前>/ の中身を、リポジトリの直下へ展開し、stacks/ とテンプレート自身の検査を消す。
// 展開できるのは1回だけ。既存のファイルは上書きしない(factory.json などの置き換え対象を除く)。
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const REPLACEABLE = new Set(["factory.json", "security.config.json", "docs/STACK.md"]);
const MERGEABLE = new Set([".gitignore"]);
const TEMPLATE_ONLY = [".github/workflows/template-selftest.yml"];

function walk(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(join(dir, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`シンボリックリンクは展開できません: ${rel}`);
    if (entry.isDirectory()) out.push(...walk(dir, rel));
    else out.push(rel);
  }
  return out;
}

const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  const available = existsSync("stacks") ? readdirSync("stacks").join(", ") : "(なし)";
  console.error(`使い方: node scripts/init-stack.mjs <名前>\n選べるスタック: ${available}`);
  process.exit(2);
}

const source = join("stacks", name);
if (!existsSync(source) || !lstatSync(source).isDirectory()) {
  console.error(`stacks/${name} がありません。`);
  process.exit(2);
}
const current = JSON.parse(readFileSync("factory.json", "utf8"));
if (current.stack) {
  console.error(`すでにスタック(${current.stack})が選ばれています。`);
  process.exit(1);
}

const files = walk(source);
const conflicts = files.filter(
  (rel) => existsSync(rel) && !REPLACEABLE.has(rel) && !MERGEABLE.has(rel),
);
if (conflicts.length > 0) {
  console.error("上書きになるファイルがあるため、何も変更せずに止めます:\n" + conflicts.map((c) => `  - ${c}`).join("\n"));
  process.exit(1);
}

for (const rel of files) {
  const from = join(source, rel);
  if (MERGEABLE.has(rel) && existsSync(rel)) {
    const have = new Set(readFileSync(rel, "utf8").split("\n"));
    const add = readFileSync(from, "utf8").split("\n").filter((l) => l && !have.has(l));
    if (add.length > 0) writeFileSync(rel, readFileSync(rel, "utf8").replace(/\n?$/, "\n") + add.join("\n") + "\n");
    continue;
  }
  mkdirSync(dirname(rel) || ".", { recursive: true });
  copyFileSync(from, rel);
}

rmSync("stacks", { recursive: true, force: true });
for (const file of TEMPLATE_ONLY) rmSync(file, { force: true });

const installed = JSON.parse(readFileSync("factory.json", "utf8"));
console.log(`スタック「${installed.stack}」を展開しました(${files.length}ファイル)。`);
console.log("次: node scripts/factory-run.mjs install → fast の順に実行して確認し、docs/STACK.md を読んでください。");
