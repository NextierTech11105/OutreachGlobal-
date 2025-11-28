import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";
// @ts-nocheck
import drizzle from "eslint-plugin-drizzle";

export default tseslint.config(
  {
    ignores: ["eslint.config.mjs", "ecosystem.config.js", "dist"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { plugins: { drizzle } },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "drizzle/enforce-delete-with-where": "error",
      "drizzle/enforce-update-with-where": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off"
    },
  }
);
