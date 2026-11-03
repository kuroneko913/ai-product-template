// hook用: 引数のパスが保護パスなら終了コード0、そうでなければ1。
import { relative, isAbsolute, resolve } from "node:path";
import { isProtected, loadPatterns } from "./lib/protected.mjs";

const target = process.argv[2];
if (!target) process.exit(2);
const path = isAbsolute(target) ? relative(resolve("."), target) : target;
if (path.startsWith("..")) process.exit(1);
process.exit(isProtected(path, loadPatterns()) ? 0 : 1);
