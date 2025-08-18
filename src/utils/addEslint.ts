import { writeFile } from "node:fs/promises"

import { CommitType } from "@src/constant"

import { addDependency } from "./addDependency"
import { addScript } from "./addScript"
import { getCommitMessage } from "./getCommitMessage"
import { hasDependency } from "./hasDependency"
import { installDependceny } from "./installDependceny"

interface GetEslintConfigParams {
    isReact: boolean
}

function getEslintConfig({ isReact }: GetEslintConfigParams) {
    const eslintConfig = `// @ts-check

import js from "@eslint/js"${
        isReact
            ? `
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"`
            : ""
    }
import { globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{js,mjs,ts${isReact ? ",tsx" : ""}}"],
        extends: [js.configs.recommended, tseslint.configs.recommended${isReact ? `, reactHooks.configs["recommended-latest"], reactRefresh.configs.vite` : ""}],
        languageOptions: {
            ecmaVersion: "latest",
            globals: globals.browser,
        },
        rules: {
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
])
`
    return eslintConfig
}

export async function addEslint() {
    const isReact = await hasDependency("react")
    const config = getEslintConfig({ isReact })
    await writeFile("eslint.config.mjs", config)
    const packages = ["@eslint/js", "typescript-eslint", "globals"]
    if (isReact) packages.push("eslint-plugin-react-hooks", "eslint-plugin-react-refresh")
    await addDependency({
        package: packages,
        type: "devDependencies",
    })
    await installDependceny()
    await addScript({ lint: "eslint ." })
    return getCommitMessage(CommitType.feature, "add eslint")
}
