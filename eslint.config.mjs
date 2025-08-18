// @ts-check

import js from "@eslint/js"
import { globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{js,mjs,ts}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: "latest",
            globals: globals.browser,
        },
        rules: {
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
])
