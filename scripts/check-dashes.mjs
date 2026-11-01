// House style check: no em dashes anywhere in the source tree. Exit 1 with locations if any are found.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const SKIP = new Set(["node_modules", ".git", "dist", ".vercel"]);
const EXT = /\.(ts|js|mjs|md|html|css|json)$/;
const bad = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.test(name)) readFileSync(p, "utf8").split("\n").forEach((l, i) => { if (l.includes(String.fromCharCode(0x2014))) bad.push(`${p}:${i + 1}`); });
  }
})(".");
if (bad.length) { console.error("Em dash found (house style forbids it):\n" + bad.join("\n")); process.exit(1); }
console.log("no em dashes");
