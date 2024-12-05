import { writeFile } from "fs/promises"
import consola from "consola"

import { AddDependenciesConfig, addDependency } from "./addDependency"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export const prettierConfigText = `// @ts-check

import { readFileSync } from "fs"
import { join, parse } from "path"
import { globSync } from "glob"

const jsExts = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs", ".cts", ".mts", ".vue"]

const assetExts = Array.from(
    new Set(
        globSync("**/*", { ignore: ["node_modules/**"], withFileTypes: true, cwd: import.meta.dirname })
            .filter(path => path.isFile() && !jsExts.some(ext => path.name.toLowerCase().endsWith(ext)))
            .map(path => parse(path.name).ext.slice(1))
            .filter(ext => ext !== ""),
    ),
)

const assetExtsRegStr = \`\\\\.(\${assetExts.join("|")}|\${assetExts.join("|").toUpperCase()})\`

const assetQueryRegStr = "(\\\\?[a-zA-Z0-9]+)?"

const packageJson = JSON.parse(readFileSync(join(import.meta.dirname, "package.json"), "utf8"))

const namespaces = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies,
})
    .filter(dep => dep.startsWith("@"))
    .map(dep => dep.split("/")[0].slice(1))

/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: ["@ianvs/prettier-plugin-sort-imports"],
    importOrder: [
        "<BUILTIN_MODULES>",
        \`^@(\${namespaces.join("|")})/\`,
        "<THIRD_PARTY_MODULES>",
        "",
        \`^@.+?(?<!\${assetExtsRegStr}\${assetQueryRegStr})$\`,
        \`^\\\\.{1,2}/.+?(?<!\${assetExtsRegStr}\${assetQueryRegStr})$\`,
        "",
        \`^@.+?\${assetExtsRegStr}\${assetQueryRegStr}$\`,
        \`^\\\\.{1,2}/.+?\${assetExtsRegStr}\${assetQueryRegStr}$\`,
    ],
    importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
    importOrderTypeScriptVersion: "5.0.0",
    importOrderCaseSensitive: true,
}

export default config
`

export const prettierConfigTextWithTailwind = `// @ts-check

import { readFileSync } from "fs"
import { join, parse } from "path"
import { globSync } from "glob"

const jsExts = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs", ".cts", ".mts", ".vue"]

const assetExts = Array.from(
    new Set(
        globSync("**/*", { ignore: ["node_modules/**"], withFileTypes: true, cwd: import.meta.dirname })
            .filter(path => path.isFile() && !jsExts.some(ext => path.name.toLowerCase().endsWith(ext)))
            .map(path => parse(path.name).ext.slice(1))
            .filter(ext => ext !== ""),
    ),
)

const assetExtsRegStr = \`\\\\.(\${assetExts.join("|")}|\${assetExts.join("|").toUpperCase()})\`

const assetQueryRegStr = "(\\\\?[a-zA-Z0-9]+)?"

const packageJson = JSON.parse(readFileSync(join(import.meta.dirname, "package.json"), "utf8"))

const namespaces = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies,
})
    .filter(dep => dep.startsWith("@"))
    .map(dep => dep.split("/")[0].slice(1))

/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: ["@ianvs/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],
    importOrder: [
        "<BUILTIN_MODULES>",
        \`^@(\${namespaces.join("|")})/\`,
        "<THIRD_PARTY_MODULES>",
        "",
        \`^@.+?(?<!\${assetExtsRegStr}\${assetQueryRegStr})$\`,
        \`^\\\\.{1,2}/.+?(?<!\${assetExtsRegStr}\${assetQueryRegStr})$\`,
        "",
        \`^@.+?\${assetExtsRegStr}\${assetQueryRegStr}$\`,
        \`^\\\\.{1,2}/.+?\${assetExtsRegStr}\${assetQueryRegStr}$\`,
    ],
    importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
    importOrderTypeScriptVersion: "5.0.0",
    importOrderCaseSensitive: true,
}

export default config
`

/** 添加 prettier */
export async function addPrettier() {
    consola.start("开始添加 prettier 配置")
    const packageJson = await readPackageJson()
    const tailwind =
        Object.keys(packageJson.dependencies ?? {}).includes("tailwindcss") || Object.keys(packageJson.devDependencies ?? {}).includes("tailwindcss")
    await writeFile("./prettier.config.mjs", tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
    const config: AddDependenciesConfig = {
        package: ["prettier", "@ianvs/prettier-plugin-sort-imports", "glob"],
        type: "devDependencies",
    }
    if (tailwind) (config.package as string[]).push("prettier-plugin-tailwindcss")
    await addDependency(config)
    const packageJson2 = await readPackageJson()
    packageJson2.scripts ??= {}
    packageJson2.scripts.lint = "prettier --write ."
    await writePackageJson({ data: packageJson2 })
    await installDependceny()
    consola.success("添加 prettier 配置成功")
}
