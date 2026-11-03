import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const config = JSON.parse(readFileSync("security.config.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const required = [
  "security:static",
  "build",
  "security:secrets",
  "security:scanner-selftest",
  "test",
];
if (
  config.version !== 1 ||
  config.configured !== true ||
  !Array.isArray(config.appChecks) ||
  config.appChecks.length === 0
)
  throw new Error(
    "Security configuration is incomplete. Review security.config.json for this app.",
  );
for (const check of config.appChecks) {
  if (
    typeof check.label !== "string" ||
    check.label.length < 3 ||
    typeof check.script !== "string"
  )
    throw new Error("Every app check needs a label and an npm script.");
  required.push(check.script);
}
for (const name of required) {
  if (
    !pkg.scripts?.[name] ||
    /CHANGE_ME|TODO/.test(pkg.scripts[name]) ||
    /CHANGE_ME|TODO/.test(name)
  )
    throw new Error(`Missing or placeholder security script: ${name}`);
}
if (!Array.isArray(config.artifactDirs) || config.artifactDirs.length === 0)
  throw new Error("Configure the built artifact directories to scan.");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const steps = [
  ["audit", "--omit=dev", "--audit-level=low"],
  ["audit", "--audit-level=moderate"],
  ...required.map((name) => ["run", name]),
];
for (const args of steps) {
  console.log(`\nSecurity check: npm ${args.join(" ")}`);
  const run = spawnSync(npm, args, {
    stdio: "inherit",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  if (run.status !== 0) {
    console.error(
      "Security checks stopped: a failure or missing prerequisite is not a pass.",
    );
    process.exit(run.status ?? 1);
  }
}
console.log(
  "\nAutomated checks passed. Production manual checks remain required; this is not a safety guarantee.",
);
