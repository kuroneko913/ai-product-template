import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const script = resolve("scripts/factory-run.mjs");

function run(factory, name) {
  const dir = mkdtempSync(join(tmpdir(), "factory-run-"));
  writeFileSync(join(dir, "factory.json"), JSON.stringify(factory));
  return spawnSync(process.execPath, [script, name], { cwd: dir, encoding: "utf8" });
}

test("スタックが未選択なら失敗する(何も実行しない)", () => {
  const r = run({ version: 1, stack: null }, "fast");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /未選択/);
});

test("コマンドの成功と失敗が、そのまま終了コードになる", () => {
  const ok = { version: 1, stack: "x", commands: { fast: `"${process.execPath}" -e "process.exit(0)"` } };
  const ng = { version: 1, stack: "x", commands: { fast: `"${process.execPath}" -e "process.exit(3)"` } };
  assert.equal(run(ok, "fast").status, 0);
  assert.equal(run(ng, "fast").status, 3);
});

test("必須のコマンドが定義されていなければ失敗する", () => {
  const r = run({ version: 1, stack: "x", commands: {} }, "security");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /commands\.security/);
});

test("任意のコマンド(e2e)が未定義なら、省略して成功する", () => {
  const r = run({ version: 1, stack: "x", commands: {} }, "e2e");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /省略/);
});

test("未知の名前は拒否する", () => {
  const r = run({ version: 1, stack: "x", commands: { rm: "echo no" } }, "rm");
  assert.equal(r.status, 2);
});
