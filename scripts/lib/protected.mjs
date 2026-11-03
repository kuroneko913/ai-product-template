// 実装するエージェントが変更してはいけないパスの判定。hook と CI の両方が使う。
import { readFileSync } from "node:fs";

/** glob を正規表現にする。`**` は階層をまたぎ、`*` は1階層内。 */
export function globToRegExp(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      out += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") out += "[^/]*";
    else if (c === "?") out += "[^/]";
    else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

export function loadPatterns(file = "protected-paths.json") {
  const config = JSON.parse(readFileSync(file, "utf8"));
  if (config.version !== 1 || !Array.isArray(config.patterns) || config.patterns.length === 0)
    throw new Error("protected-paths.json が不正です");
  return config.patterns.map((glob) => ({ glob, regexp: globToRegExp(glob) }));
}

export function isProtected(path, patterns) {
  const normalized = path.replace(/^\.\//, "");
  return patterns.some((p) => p.regexp.test(normalized));
}

export function findProtected(paths, patterns) {
  return paths.filter((p) => isProtected(p, patterns));
}
