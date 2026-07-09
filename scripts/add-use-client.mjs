// esbuild strips top-of-file "use client" directives when bundling, and tsup's
// `banner` option doesn't reliably survive that pass. Prepend it deterministically
// so Next.js app-router (RSC) consumers treat the module as a Client Component.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const DIRECTIVE = '"use client";\n';

for (const file of ["index.js", "index.cjs"]) {
  const path = join(dist, file);
  const src = await readFile(path, "utf8");
  if (src.startsWith('"use client"') || src.startsWith("'use client'")) continue;
  await writeFile(path, DIRECTIVE + src);
  console.log(`prepended "use client" → dist/${file}`);
}
