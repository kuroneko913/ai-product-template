import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const script = resolve("scripts/guard-protected-paths.mjs");
const patterns = resolve("protected-paths.json");

function git(cwd, ...args) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.test", ...args], { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function write(dir, rel, content) {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), content);
}
/** 基点のコミットに files を置き、変更を加えたブランチに対して、ガードを実行する。 */
function run({ base, change, env = {} }) {
  const dir = mkdtempSync(join(tmpdir(), "guard-"));
  git(dir, "init", "-q", "-b", "main");
  copyFileSync(patterns, join(dir, "protected-paths.json"));
  for (const [rel, content] of Object.entries(base)) write(dir, rel, content);
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "base");
  const baseSha = git(dir, "rev-parse", "HEAD");
  git(dir, "checkout", "-q", "-b", "feature");
  change(dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "change");
  return spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8", env: { ...process.env, BASE_SHA: baseSha, ...env } });
}

test("保護パスを変更すると、失敗する", () => {
  const r = run({ base: { "tests/acceptance/a.test.ts": "1" }, change: (d) => write(d, "tests/acceptance/a.test.ts", "2") });
  assert.equal(r.status, 1);
});

test("通常のファイルだけの変更は、通る", () => {
  const r = run({ base: { "src/a.ts": "1" }, change: (d) => write(d, "src/a.ts", "2") });
  assert.equal(r.status, 0);
});

test("ラベル(人間の承認)があれば、通る", () => {
  const r = run({
    base: { "tests/acceptance/a.test.ts": "1" },
    change: (d) => write(d, "tests/acceptance/a.test.ts", "2"),
    env: { PROTECTED_CHANGE_LABEL: "true" },
  });
  assert.equal(r.status, 0);
});

test("保護ファイルを、保護されていない場所へ移動しても、失敗する(移動元も見る)", () => {
  const r = run({
    base: { "tests/acceptance/example.test.ts": "same content\nwith several lines\nso that rename detection applies\n" },
    change: (d) => {
      mkdirSync(join(d, "src"), { recursive: true });
      git(d, "mv", "tests/acceptance/example.test.ts", "src/example.test.ts");
    },
  });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /tests\/acceptance\/example\.test\.ts/);
});

test("保護されていない場所から、保護パスへ移動しても、失敗する(移動先も見る)", () => {
  const r = run({
    base: { "src/example.test.ts": "same content\nwith several lines\nso that rename detection applies\n" },
    change: (d) => {
      mkdirSync(join(d, "tests/acceptance"), { recursive: true });
      git(d, "mv", "src/example.test.ts", "tests/acceptance/example.test.ts");
    },
  });
  assert.equal(r.status, 1, r.stdout + r.stderr);
});

test("保護ファイルを削除しても、失敗する", () => {
  const r = run({
    base: { ".github/CODEOWNERS": "* @owner\n" },
    change: (d) => git(d, "rm", "-q", ".github/CODEOWNERS"),
  });
  assert.equal(r.status, 1);
});

test("BASE_SHA がなければ(プルリクエストでなければ)、省略して通る", () => {
  const r = spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, BASE_SHA: "" } });
  assert.equal(r.status, 0);
});
