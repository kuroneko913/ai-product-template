import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const script = resolve("scripts/init-stack.mjs");

function workspace(files) {
  const dir = mkdtempSync(join(tmpdir(), "init-stack-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}
const run = (dir, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8" });

const base = () => ({
  "factory.json": JSON.stringify({ version: 1, stack: null }),
  "security.config.json": '{"version":1,"artifactDirs":[]}',
  ".gitignore": ".env\n",
  "stacks/demo/factory.json": JSON.stringify({ version: 1, stack: "demo", commands: { fast: "true" } }),
  "stacks/demo/security.config.json": '{"version":1,"artifactDirs":["dist"]}',
  "stacks/demo/.gitignore": "dist\n.env\n",
  "stacks/demo/src/app.txt": "app",
  "stacks/other/factory.json": "{}",
});

test("スタックを展開し、stacks/ を消す", () => {
  const dir = workspace(base());
  const r = run(dir, "demo");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(readFileSync(join(dir, "factory.json"), "utf8")).stack, "demo");
  assert.equal(readFileSync(join(dir, "src/app.txt"), "utf8"), "app");
  assert.equal(JSON.parse(readFileSync(join(dir, "security.config.json"), "utf8")).artifactDirs[0], "dist");
  assert.equal(existsSync(join(dir, "stacks")), false);
});

test(".gitignore は、重複を除いて追記する", () => {
  const dir = workspace(base());
  run(dir, "demo");
  assert.equal(readFileSync(join(dir, ".gitignore"), "utf8"), ".env\ndist\n");
});

test("すでにスタックが選ばれていれば、何もしない", () => {
  const dir = workspace({ ...base(), "factory.json": JSON.stringify({ version: 1, stack: "demo" }) });
  const r = run(dir, "demo");
  assert.equal(r.status, 1);
  assert.equal(existsSync(join(dir, "stacks/demo")), true);
});

test("上書きになるファイルがあれば、1つも書かずに止まる", () => {
  const dir = workspace({ ...base(), "src/app.txt": "mine" });
  const r = run(dir, "demo");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /src\/app\.txt/);
  assert.equal(readFileSync(join(dir, "src/app.txt"), "utf8"), "mine");
  assert.equal(JSON.parse(readFileSync(join(dir, "factory.json"), "utf8")).stack, null);
  assert.equal(existsSync(join(dir, "stacks/demo")), true);
});

test("存在しない名前や不正な名前は拒否する", () => {
  const dir = workspace(base());
  assert.equal(run(dir, "nope").status, 2);
  assert.equal(run(dir, "../etc").status, 2);
  assert.equal(run(dir).status, 2);
});
