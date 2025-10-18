import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://localhost:3001/graphql",
  documents: ["./src/**/*.{tsx,ts}"],
  ignoreNoDocuments: true,
  generates: {
    "./src/graphql/types/graphql-object.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        dedupeFragments: true,
        namingConvention: {
          enumValues: "keep",
        },
      },
    },
  },
};

export default config;
