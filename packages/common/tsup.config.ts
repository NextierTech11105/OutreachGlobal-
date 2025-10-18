import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entry: ["src/index.ts"],
  dts: true,
  outDir: "dist",
  clean: true,
  treeshake: true,
  format: ["cjs", "esm"],
  cjsInterop: true,
  splitting: false,
}));
