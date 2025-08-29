// @ts-check

import js from "@eslint/js"
import { globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config([
    globalIgnores(["node_modules", "dist", "build", "public"]),
    {
        files: ["**/*.{js,mjs,ts}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: "latest",
            globals: globals.browser,
        },
        rules: {
            "@typescript-eslint/no-empty-object-type": "off",
            "no-empty": "off",
            "no-extra-boolean-cast": "off",
            "no-unused-vars": "off",
            "react-refresh/only-export-components": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    ignoreRestSiblings: true,
                    args: "none",
                },
            ],
            "prefer-const": [
                "off",
                {
                    destructuring: "any",
                },
            ],
        },
    },
])
