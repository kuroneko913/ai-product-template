import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  lstatSync,
  rmSync,
  cpSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join, isAbsolute } from "node:path";
const git =
  process.env.GIT_BIN ||
  (existsSync("/opt/homebrew/bin/git") ? "/opt/homebrew/bin/git" : "git");
const scanner =
  process.env.GITLEAKS_BIN || resolve(".local-tools/gitleaks/gitleaks");
function gitBytes(args) {
  const result = spawnSync(git, args, {
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error("Git prerequisite failed.");
  return result.stdout;
}
function gitOutput(args) {
  return gitBytes(args).toString("utf8");
}
if (!existsSync(scanner))
  throw new Error("Gitleaks is missing. Run npm run security:tools first.");
const manifest = JSON.parse(
  readFileSync(new URL("./gitleaks-release.json", import.meta.url), "utf8"),
);
const version = spawnSync(scanner, ["version"], { encoding: "utf8" });
if (version.status !== 0 || version.stdout.trim() !== manifest.version)
  throw new Error(
    "Pinned Gitleaks version is required; run npm run security:tools.",
  );
if (gitOutput(["rev-parse", "--is-shallow-repository"]).trim() !== "false")
  throw new Error("Full Git history is required (fetch-depth: 0).");
const config = JSON.parse(readFileSync("security.config.json", "utf8"));
// ビルド成果物がない構成(CLI、ライブラリなど)では、artifactDirs は空でよい。
if (!Array.isArray(config.artifactDirs))
  throw new Error("artifactDirs must be an array (use [] when there is no build output).");
for (const path of config.artifactDirs) {
  if (
    typeof path !== "string" ||
    !path.split("/").every((part) => /^[a-zA-Z0-9_-]+$/.test(part)) ||
    !existsSync(path) ||
    !lstatSync(path).isDirectory() ||
    lstatSync(path).isSymbolicLink()
  )
    throw new Error(
      "A configured artifact directory is missing or invalid; run the build first.",
    );
}
const temp = mkdtempSync(join(tmpdir(), "web-security-secret-scan-"));
let failed = false;
try {
  const snapshot = join(temp, "working-tree");
  mkdirSync(snapshot);
  // Include changed and untracked non-ignored files, but never local credential files/downloads.
  const paths = gitOutput(["ls-files", "-c", "-o", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean);
  for (const path of new Set(paths)) {
    const source = resolve(path);
    if (!existsSync(source)) continue;
    if (lstatSync(source).isSymbolicLink())
      throw new Error("Symlinks require review before scanning.");
    const target = join(snapshot, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(source));
  }
  const indexSnapshot = join(temp, "git-index");
  mkdirSync(indexSnapshot);
  for (const record of gitOutput(["ls-files", "--stage", "-z"])
    .split("\0")
    .filter(Boolean)) {
    const separator = record.indexOf("\t");
    const [mode, hash, stage] = record.slice(0, separator).split(" ");
    const path = record.slice(separator + 1);
    if (
      separator < 0 ||
      stage !== "0" ||
      !["100644", "100755"].includes(mode) ||
      ![40, 64].includes(hash?.length) ||
      !/^[0-9a-f]+$/.test(hash)
    )
      throw new Error(
        "Git index contains unresolved entries or unsupported file types; review it before scanning.",
      );
    const target = join(indexSnapshot, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, gitBytes(["cat-file", "blob", hash]), {
      mode: 0o600,
    });
  }
  const scans = [
    { name: "Git history", args: ["git", resolve("."), "--log-opts=--all"] },
    { name: "Working tree", args: ["dir", snapshot] },
    { name: "Git index", args: ["dir", indexSnapshot] },
  ];
  for (const [index, directory] of config.artifactDirs.entries()) {
    const build = join(temp, `build-${index}`);
    cpSync(directory, build, { recursive: true, dereference: false });
    scans.push({
      name: `Built artifacts (${directory})`,
      args: ["dir", build],
    });
  }
  for (const [index, scan] of scans.entries()) {
    const report = join(temp, `report-${index}.json`);
    const run = spawnSync(
      scanner,
      [
        ...scan.args,
        "--redact=100",
        "--no-banner",
        "--report-format=json",
        `--report-path=${report}`,
      ],
      {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        env: {
          ...process.env,
          PATH: isAbsolute(git)
            ? `${dirname(git)}:${process.env.PATH}`
            : process.env.PATH,
        },
      },
    );
    if (run.status === 0) {
      console.log(`${scan.name}: no detected secrets.`);
      continue;
    }
    failed = true;
    if (run.status !== 1 || !existsSync(report)) {
      console.error(
        `${scan.name}: scanner failed; check local tool prerequisites.`,
      );
      continue;
    }
    const findings = JSON.parse(readFileSync(report, "utf8"));
    console.error(
      `${scan.name}: ${findings.length} finding(s); secret values and source snippets are suppressed.`,
    );
    for (const f of findings)
      console.error(
        JSON.stringify({
          rule: f.RuleID,
          file: f.File?.replace(snapshot + "/", "")
            .replace(indexSnapshot + "/", "")
            .replace(temp + "/", "scanned-artifacts/"),
          line: f.StartLine,
          commit: f.Commit?.slice(0, 12),
        }),
      );
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
process.exitCode = failed ? 1 : 0;
