import { defineFlatConfig } from "eslint-define-config";
import globals from "globals";
import pluginJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import prettierPlugin from "eslint-plugin-prettier";

const config = defineFlatConfig(
  [
    pluginJs.configs.recommended,
    {
      files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
        globals: globals.browser,
      },
      plugins: {
        prettier: prettierPlugin,
        "@typescript-eslint": tsPlugin,
      },
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "react/react-in-jsx-scope": "off",
        "prettier/prettier": "error",
      },
    },
  ],
  {
    settings: {
      react: {
        version: "detect", // Specify 'detect' to automatically detect the React version
      },
    },
  }
);

export default config;
