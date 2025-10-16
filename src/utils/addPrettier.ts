import { writeFile } from "fs/promises"
import consola from "consola"

import { AddDependenciesConfig, addDependency } from "./addDependency"
import { hasDependency } from "./hasDependency"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

const ignoreConfig = `node_modules
public
dist
build
generated
.next
.vscode
.generated
`

const prettierConfig = `// @ts-check

/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    endOfLine: "lf",
    plugins: ["./prettier-plugin-sort-imports.mjs"],
}

export default config
`

/**
 * prettier 配置生成器参数
 */
export interface GetPluginConfigParams {
    /** 是否使用 tailwind */
    isTailwind: boolean
    /** 是否是 react 项目 */
    isReact: boolean
}

function getPluginConfig({ isTailwind, isReact }: GetPluginConfigParams) {
    const config = `// @ts-check

import { readFileSync } from "fs"
import { builtinModules } from "module"

import { createPlugin } from "@1adybug/prettier-plugin-sort-imports"
import JSON5 from "json5"
import blockPadding from "prettier-plugin-block-padding"${
        isTailwind
            ? `
import * as tailwindcss from "prettier-plugin-tailwindcss"`
            : ""
    }
${
    isReact
        ? `
/**
 * @param {string} path
 */
function isReact(path) {
    return /^@?react\\b/.test(path)
}
`
        : ""
}
/**
 * @param {string} path
 */
function isBuiltin(path) {
    return path.startsWith("node:") || builtinModules.includes(path)
}

/** @type {string[]} */
let pathAlias = []

try {
    const tsConfig = JSON5.parse(readFileSync("tsconfig.json", "utf-8"))
    pathAlias = Object.keys(tsConfig.compilerOptions?.paths ?? {})
        .map(item => item.match(/^(@.*\\/)\\*/))
        .filter(Boolean)
        .map(item => /** @type {string} */ (item?.[1]))
} catch {}

/**
 * @param {string} path
 */
function isAbsolute(path) {
    return pathAlias.some(item => path.startsWith(item))
}

/**
 * @param {string} path
 */
function isRelative(path) {
    return path.startsWith("./") || path.startsWith("../")
}

/**
 * @param {string} a
 * @param {string} b
 */
function compareGroupName(a, b) {
    const orders = [${isReact ? `"react", ` : ""}"builtin", "third-party", "absolute", "relative"]

    a = a.replace(/-side-effect$/, "")
    b = b.replace(/-side-effect$/, "")
    return orders.indexOf(a) - orders.indexOf(b) || a.localeCompare(b)
}

export default createPlugin({
    getGroup({ path, isSideEffect }) {
        if (isSideEffect) {${
            isReact
                ? `
            if (isReact(path)) return "react-side-effect"`
                : ""
        }
            if (isBuiltin(path)) return "builtin-side-effect"
            if (isAbsolute(path)) return "absolute-side-effect"
            if (isRelative(path)) return "relative-side-effect"
            return "third-party-side-effect"
        }
${
    isReact
        ? `
        if (isReact(path)) return "react"`
        : ""
}
        if (isBuiltin(path)) return "builtin"
        if (isAbsolute(path)) return "absolute"
        if (isRelative(path)) return "relative"
        return "third-party"
    },
    sortGroup(a, b) {
        return (
            Number(a.isSideEffect) - Number(b.isSideEffect) ||
            compareGroupName(a.name, b.name)
        )
    },
    separator: "",
    sortSideEffect: true,
    removeUnusedImports: true,
    otherPlugins: [blockPadding${isTailwind ? ", tailwindcss" : ""}],
})
`
    return config
}

/**
 * 添加 prettier 相关配置
 * 包括安装依赖、创建配置文件等
 */
export async function addPrettier() {
    consola.start("开始添加 prettier 配置")
    const packageJson = await readPackageJson()
    const isTailwind =
        Object.keys(packageJson.dependencies ?? {}).includes("tailwindcss") || Object.keys(packageJson.devDependencies ?? {}).includes("tailwindcss")
    const isReact = await hasDependency("react")
    await writeFile("prettier-plugin-sort-imports.mjs", getPluginConfig({ isTailwind, isReact }), "utf-8")
    await writeFile("prettier.config.mjs", prettierConfig, "utf-8")
    await writeFile(".prettierignore", ignoreConfig, "utf-8")
    const config2: AddDependenciesConfig = {
        package: ["prettier", "@1adybug/prettier-plugin-sort-imports", "prettier-plugin-block-padding", "json5"],
        type: "devDependencies",
    }
    if (isTailwind) (config2.package as string[]).push("prettier-plugin-tailwindcss")
    await addDependency(config2)
    const packageJson2 = await readPackageJson()
    packageJson2.scripts ??= {}
    packageJson2.scripts.format = "prettier --write ."
    packageJson2.scripts.fg = 'npm run format && git add . && git commit -m "✨feature: format"'
    await writePackageJson({ data: packageJson2 })
    await installDependceny()
    consola.success("添加 prettier 配置成功")
}
