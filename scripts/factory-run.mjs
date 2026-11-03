// 標準の入口を実行する: node scripts/factory-run.mjs <install|fast|security|acceptance|e2e>
// コマンドの中身は factory.json(保護パス)に書かれている。技術スタックに依存しない。
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const REQUIRED = ["install", "fast", "security", "acceptance"];
const OPTIONAL = ["e2e"];

const name = process.argv[2];
if (![...REQUIRED, ...OPTIONAL].includes(name)) {
  console.error(`使い方: node scripts/factory-run.mjs <${[...REQUIRED, ...OPTIONAL].join("|")}>`);
  process.exit(2);
}

const config = JSON.parse(readFileSync("factory.json", "utf8"));
if (config.version !== 1) throw new Error("factory.json の version が不正です");

if (!config.stack) {
  console.error(
    "スタックが未選択です。`node scripts/init-stack.mjs <名前>` で選んでください(stacks/ に候補があります)。",
  );
  process.exit(1);
}

const command = config.commands?.[name];
if (typeof command !== "string" || command.trim() === "") {
  if (OPTIONAL.includes(name)) {
    console.log(`${name}: このスタックには定義がないため、省略します。`);
    process.exit(0);
  }
  console.error(`factory.json に commands.${name} がありません。`);
  process.exit(1);
}

console.log(`\nfactory: ${name} → ${command}`);
const result = spawnSync(command, { shell: true, stdio: "inherit" });
process.exit(result.status ?? 1);
