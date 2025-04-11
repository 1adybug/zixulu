import { writeFile } from "fs/promises"
import consola from "consola"

import { AddDependenciesConfig, addDependency } from "./addDependency"
import { getDependcy } from "./getDependcy"
import { hasDependency } from "./hasDependency"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { readTsConfig } from "./readTsConfig"
import { writePackageJson } from "./writePackageJson"

const originalConfig = `// @ts-check

/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: ["prettier-plugin-organize-imports"],
}

export default config
`

const ignoreConfig = `node_modules
public
dist
build
`

/**
 * prettier 配置生成器参数
 */
export type GetPrettierConfigParams = {
    /** 是否使用 tailwind */
    tailwind: boolean
    /** 是否使用了本地 @images 类似的别名 */
    atAlias: boolean
    /** 是否是 next 项目 */
    next: boolean
    /** 是否是 react 项目 */
    react: boolean
}

/**
 * 生成 prettier 配置文件内容
 * @param params 配置参数
 */
export function getPrettierConfig({ tailwind, atAlias, next, react }: GetPrettierConfigParams) {
    const plugins = ["@ianvs/prettier-plugin-sort-imports"]

    if (tailwind) plugins.push("prettier-plugin-tailwindcss")

    const prettierConfigText = `// @ts-check
${
    atAlias
        ? `
import { readFileSync } from "fs"`
        : ""
}
import { parse } from "path"
import { globSync } from "glob"

/**
 * 数组去重
 * @template T - 数组的元素类型
 * @param {T[]} array - 输入的数组
 * @return {T[]} 新数组
 */
function unique(array) {
    return Array.from(new Set(array))
}

const jsExts = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs", ".cts", ".mts", ".vue"]

const assetExts = unique(
    globSync("**/*", { ignore: ["node_modules/**"${next ? `, ".next/**"` : ""}], withFileTypes: true, cwd: import.meta.dirname })
        .filter(path => path.isFile() && !jsExts.some(ext => path.name.toLowerCase().endsWith(ext)))
        .map(path => parse(path.name).ext.slice(1))
        .filter(ext => ext !== ""),
)

const assetExtsRegStr = \`\\\\.(\${assetExts.join("|")}|\${assetExts.join("|").toUpperCase()})\`

const assetQueryRegStr = "(\\\\?[a-zA-Z0-9]+)?"
${
    atAlias
        ? `
const namespaces = unique(
    unique(
        globSync("**/package.json", { withFileTypes: true, cwd: import.meta.dirname })
            .filter(path => path.isFile())
            .map(path => path.fullpath()),
    )
        .map(path => JSON.parse(readFileSync(path, "utf8")))
        .map(json =>
            Object.keys({
                ...json.dependencies,
                ...json.devDependencies,
                ...json.peerDependencies,
                ...json.optionalDependencies,
            }),
        )
        .flat()
        .filter(dep => dep.startsWith("@"))
        .map(dep => dep.split("/")[0].slice(1)),
)
`
        : ""
}
const folders = unique(
    globSync("**/*", { withFileTypes: true, cwd: import.meta.dirname, ignore: ["node_modules/**"${next ? `, ".next/**"` : ""}] })
        .filter(path => path.isDirectory())
        .map(path => path.name),
).sort()

/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: [${plugins.map(plugin => `"${plugin}"`).join(", ")}],
    importOrder: [${
        react
            ? `
        "^react(/.+)?$",
        "^react-dom(/.+)?$",
        "^react-native(/.+)?$",`
            : ""
    }
        "<BUILTIN_MODULES>",
        ${atAlias ? `\`^@(\${namespaces.join("|")})/\`,` : `"^@[^/]",`}
        "<THIRD_PARTY_MODULES>",
        ...folders.map(folder => ["", \`^@/?\${folder}(.+?(?<!\${assetExtsRegStr}\${assetQueryRegStr}))?$\`]).flat(),
        "",
        \`^@/.+?(?<!\${assetExtsRegStr}\${assetQueryRegStr})$\`,
        \`^\\\\.{1,2}/.+?(?<!\${assetExtsRegStr}\${assetQueryRegStr})$\`,
        "",
        \`^@/.+?\${assetExtsRegStr}\${assetQueryRegStr}$\`,
        \`^\\\\.{1,2}/.+?\${assetExtsRegStr}\${assetQueryRegStr}$\`,
    ],
    importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
    importOrderTypeScriptVersion: "5.0.0",
    importOrderCaseSensitive: true,
}

export default config
`
    return prettierConfigText
}

/**
 * 添加 prettier 相关配置
 * 包括安装依赖、创建配置文件等
 */
export async function addPrettier() {
    consola.start("开始添加 prettier 配置")
    const packageJson = await readPackageJson()
    const tailwind =
        Object.keys(packageJson.dependencies ?? {}).includes("tailwindcss") || Object.keys(packageJson.devDependencies ?? {}).includes("tailwindcss")
    let atAlias = false
    try {
        const config = await readTsConfig()
        atAlias = Object.keys(config.compilerOptions?.paths ?? {}).some(path => /^@[a-zA-Z]/.test(path))
    } catch (error) {}
    const next = await hasDependency("next")
    const react = await hasDependency("react")
    await writeFile("prettier.config.mjs", originalConfig, "utf-8")
    await writeFile(".prettierrc.mjs", getPrettierConfig({ tailwind, atAlias, next, react }), "utf-8")
    await writeFile(".prettierignore", ignoreConfig, "utf-8")
    const config2: AddDependenciesConfig = {
        package: ["prettier", "@ianvs/prettier-plugin-sort-imports", "glob", "prettier-plugin-organize-imports"],
        type: "devDependencies",
    }
    if (tailwind) (config2.package as string[]).push("prettier-plugin-tailwindcss")
    await addDependency(config2)
    const packageJson2 = await readPackageJson()
    packageJson2.scripts ??= {}
    packageJson2.scripts.format = "prettier --config prettier.config.mjs --write . && prettier --config .prettierrc.mjs --write ."
    await writePackageJson({ data: packageJson2 })
    await installDependceny()
    consola.success("添加 prettier 配置成功")
}
