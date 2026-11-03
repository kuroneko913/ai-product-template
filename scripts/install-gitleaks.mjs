import { readFile, mkdir, writeFile, chmod } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const manifest = JSON.parse(
  await readFile(new URL("./gitleaks-release.json", import.meta.url), "utf8"),
);
const asset = manifest.platforms[`${process.platform}-${process.arch}`];
if (!asset)
  throw new Error(
    "Unsupported platform: install the pinned Gitleaks manually.",
  );
const target = resolve(".local-tools/gitleaks");
await mkdir(target, { recursive: true });
const response = await fetch(
  `https://github.com/gitleaks/gitleaks/releases/download/v${manifest.version}/${asset.asset}`,
  { signal: AbortSignal.timeout(60000) },
);
if (!response.ok) throw new Error("Official Gitleaks download failed.");
const bytes = new Uint8Array(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
  throw new Error("Gitleaks checksum mismatch.");
const archive = resolve(target, asset.asset);
await writeFile(archive, bytes);
const extracted = spawnSync(
  "tar",
  ["-xzf", archive, "-C", target, "gitleaks"],
  { stdio: "pipe" },
);
if (extracted.status !== 0) throw new Error("Gitleaks extraction failed.");
await chmod(resolve(target, "gitleaks"), 0o755);
console.log(
  `Installed local Gitleaks ${manifest.version}; pinned SHA256 verified.`,
);
