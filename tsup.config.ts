import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // The component is a Client Component. esbuild strips top-of-file directives
  // during bundling, so `scripts/add-use-client.mjs` re-adds "use client" after
  // the build to keep Next.js app-router (RSC) consumers happy.
  external: ["react", "react-dom", "framer-motion"],
});
