import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync, rmSync } from "node:fs";
const file = ".security-scanner-canary.txt";
if (existsSync(file))
  throw new Error("Canary file already exists; will not overwrite it.");
const synthetic =
  ["gh", "p_"].join("") + randomBytes(24).toString("hex").slice(0, 36);
try {
  writeFileSync(file, `github_token = ${synthetic}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  const result = spawnSync(process.execPath, ["scripts/secret-scan.mjs"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 1 || !result.stderr.includes(file))
    throw new Error("Secret scanner did not reject the synthetic canary.");
  if ((result.stdout + result.stderr).includes(synthetic))
    throw new Error("Scanner output leaked the synthetic secret.");
  console.log(
    "Secret scanner self-test: rejects synthetic credential and suppresses its value.",
  );
} finally {
  rmSync(file, { force: true });
}
