import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import { globalIgnores } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  globalIgnores([
    "eslint.config.mjs",
    "ecosystem.config.js",
    "src/graphql/types/graphql-object.ts",
    "**/dist/**",
    "**/dist/*.js",
    "src/**/dist/**",
    "src/app/api/**/dist/**",
    "src/lib/**/dist/**",
  ]),
  prettierRecommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      // TODO: remove this tag once monorepo ready
      "react/no-unescaped-entities": "off",
      // Disable exhaustive-deps - often intentional and can cause infinite loops if blindly followed
      "react-hooks/exhaustive-deps": "off",
      // Allow anonymous default exports (common pattern)
      "import/no-anonymous-default-export": "off",
      // Display name for components
      "react/display-name": "off",
      // TODO: Convert <a> tags to <Link> components  
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];

export default eslintConfig;
