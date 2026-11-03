import assert from "node:assert/strict";
import { test } from "node:test";
import { findProtected, globToRegExp, isProtected, loadPatterns } from "../lib/protected.mjs";

const patterns = loadPatterns();

test("保護対象のファイルを見つける", () => {
  for (const path of [
    "tests/acceptance/health.acceptance.test.ts",
    ".github/workflows/ci.yml",
    ".claude/settings.json",
    "scripts/secret-scan.mjs",
    "factory.json",
    "security.config.json",
    "wrangler.jsonc",
    "AGENTS.md",
  ])
    assert.equal(isProtected(path, patterns), true, path);
});

test("通常のアプリのコードは対象にしない", () => {
  for (const path of ["src/App.tsx", "worker/api.ts", "tests/unit/worker.test.ts", "README.md", "docs/SETUP.md"])
    assert.equal(isProtected(path, patterns), false, path);
});

test("変更の一覧から、保護対象だけを返す", () => {
  const hits = findProtected(["src/App.tsx", ".github/CODEOWNERS", "tests/acceptance/a.test.ts"], patterns);
  assert.deepEqual(hits, [".github/CODEOWNERS", "tests/acceptance/a.test.ts"]);
});

test("`*` は階層をまたがず、`**` はまたぐ", () => {
  assert.equal(globToRegExp("a/*.ts").test("a/b.ts"), true);
  assert.equal(globToRegExp("a/*.ts").test("a/b/c.ts"), false);
  assert.equal(globToRegExp("a/**").test("a/b/c.ts"), true);
  assert.equal(globToRegExp("a/**/c.ts").test("a/c.ts"), true);
});

test("似た名前を取り違えない", () => {
  assert.equal(isProtected("my-scripts/run.mjs", patterns), false);
  assert.equal(isProtected("src/scripts/run.ts", patterns), false);
  assert.equal(isProtected("wrangler.jsonc.bak", patterns), false);
});
