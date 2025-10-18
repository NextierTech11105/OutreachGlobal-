import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  dts: true,
  outDir: "dist",
  clean: !options.watch,
  treeshake: true,
  format: ["cjs", "esm"],
  cjsInterop: true,
  splitting: false,
}));
