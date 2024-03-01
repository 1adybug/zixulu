import { spawn } from "child_process"
import consola from "consola"
import { Stats, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs"
import * as JSON5 from "json5"
import { ParsedPath, isAbsolute, join, parse } from "path"
import { Config } from "prettier"
import { cwd, exit } from "process"

function getAbsolutePath(path: string) {
    return isAbsolute(path) ? path : join(cwd(), path)
}

export function getPackageJsonPath(path?: string) {
    return join(getAbsolutePath(path ?? cwd()), "package.json")
}

export function getTsConfigJsonPath(path?: string) {
    return join(getAbsolutePath(path ?? cwd()), "tsconfig.json")
}

/** 获取包的最新版本 */
export async function getPackageLatestVersion(packageName: string) {
    try {
        const url = `https://registry.npmjs.org/${packageName}/latest`
        const response = await fetch(url)
        const data = await response.json()
        return data.version as string
    } catch (error) {
        consola.fail(`获取 ${packageName} 最新版本号失败`)
        exit()
    }
}

export async function getPackageVersions(packageName: string) {
    try {
        const url = `https://registry.npmjs.org/${packageName}`
        const response = await fetch(url)
        const data = await response.json()
        return Object.keys(data.versions) as string[]
    } catch (error) {
        consola.fail(`获取 ${packageName} 版本号失败`)
        exit()
    }
}

export function getVersionFromRequiredVersion(requiredVersion: string) {
    return requiredVersion.replace(/^\D*/, "")
}

export function getVersionNum(version: string) {
    const nums = version.split(".").map(Number)
    if (nums.some(num => !Number.isInteger(num) || num < 0) || nums.length < 3) {
        consola.fail(`无效的版本号 ${version}`)
        exit()
    }
    return nums
}

export async function getPackageUpgradeVersion(packageName: string, version: string, level: "major" | "minor" | "patch") {
    if (level === "major") {
        const latestVersion = await getPackageLatestVersion(packageName)
        if (version === latestVersion) return undefined
        return latestVersion
    }
    const [major, minor, patch] = getVersionNum(version)
    const versions = await getPackageVersions(packageName)
    return versions.find((item, index) => {
        const [a, b, c] = getVersionNum(item)
        if (index === 0) {
            if ((a > major && level === "minor") || (a >= major && b > minor && level === "patch")) consola.log(`发现 ${packageName} 的新版本 ${item}`)
        }
        return (level === "minor" && a === major && b > minor) || (level === "patch" && a === major && b === minor && c > patch)
    })
}

/** 读取 package.json */
export function readPackageJson(path?: string): Record<string, any> {
    try {
        const result = JSON.parse(readFileSync(getPackageJsonPath(path), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 package.json 失败")
        exit()
    }
}

/** 读取 tsconfig.json */
export function readTsConfigJSON(path?: string): Record<string, any> {
    try {
        const result = JSON5.parse(readFileSync(getTsConfigJsonPath(path), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 tsconfig.json 失败")
        exit()
    }
}

/** 写入依赖 */
export async function addDependencies(packageJson: Record<string, any>, packageName: string, version?: string) {
    try {
        packageJson.dependencies ??= {}
        packageJson.dependencies[packageName] ??= version?.trim() || `^${await getPackageLatestVersion(packageName)}`
        const keys = Object.keys(packageJson.dependencies)
        keys.sort()
        const sortedDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDependencies[key] = packageJson.dependencies[key]
        }
        packageJson.dependencies = sortedDependencies
        consola.success(`添加 ${packageName} 至依赖成功`)
    } catch (error) {
        consola.fail(`添加 ${packageName} 至依赖失败`)
        exit()
    }
}

/** 写入最新依赖 */
export async function addLatestDependencies(packageJson: Record<string, any>, packageName: string) {
    try {
        packageJson.dependencies ??= {}
        packageJson.dependencies[packageName] = `^${await getPackageLatestVersion(packageName)}`
        const keys = Object.keys(packageJson.dependencies)
        keys.sort()
        const sortedDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDependencies[key] = packageJson.dependencies[key]
        }
        packageJson.dependencies = sortedDependencies
        consola.success(`添加 ${packageName} 至依赖成功`)
    } catch (error) {
        consola.fail(`添加 ${packageName} 至依赖失败`)
        exit()
    }
}

/** 写入开发依赖 */
export async function addDevDependencies(packageJson: Record<string, any>, packageName: string, version?: string) {
    try {
        packageJson.devDependencies ??= {}
        packageJson.devDependencies[packageName] ??= version?.trim() || `^${await getPackageLatestVersion(packageName)}`
        const keys = Object.keys(packageJson.devDependencies)
        keys.sort()
        const sortedDevDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDevDependencies[key] = packageJson.devDependencies[key]
        }
        packageJson.devDependencies = sortedDevDependencies
        consola.success(`添加 ${packageName} 至开发依赖成功`)
    } catch (error) {
        consola.fail(`添加 ${packageName} 至开发依赖失败`)
        exit()
    }
}

/** 写入最新开发依赖 */
export async function addLatestDevDependencies(packageJson: Record<string, any>, packageName: string) {
    try {
        packageJson.devDependencies ??= {}
        packageJson.devDependencies[packageName] = `^${await getPackageLatestVersion(packageName)}`
        const keys = Object.keys(packageJson.devDependencies)
        keys.sort()
        const sortedDevDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDevDependencies[key] = packageJson.devDependencies[key]
        }
        packageJson.devDependencies = sortedDevDependencies
        consola.success(`添加 ${packageName} 至开发依赖成功`)
    } catch (error) {
        consola.fail(`添加 ${packageName} 至开发依赖失败`)
        exit()
    }
}

/** 写回 package.json */
export function writePackageJson(packageJson: Record<string, any>, path?: string) {
    try {
        writeFileSync(getPackageJsonPath(path), JSON.stringify(packageJson, undefined, 4), "utf-8")
        consola.success("修改 package.json 成功")
    } catch (error) {
        consola.fail("修改 package.json 失败")
        exit()
    }
}

export interface GetFilesOptions {
    depth?: number
    exclude?: (path: ParsedPath, stats: Stats) => boolean
}

export function getFiles(path: string, judge: (path: ParsedPath, stats: Stats) => boolean, depthOrOptions?: number | GetFilesOptions) {
    const result: string[] = []
    function _getFiles(path: string, judge: (path: ParsedPath, stats: Stats) => boolean, depthOrOptions?: number | GetFilesOptions) {
        const options: GetFilesOptions = typeof depthOrOptions === "number" ? { depth: depthOrOptions } : depthOrOptions ?? {}
        const { depth, exclude } = options
        path = getAbsolutePath(path)
        const files = readdirSync(path)
        for (const file of files) {
            const filePath = join(path, file)
            const parsedPath = parse(filePath)
            const stat = statSync(filePath)
            if (judge(parsedPath, stat)) {
                result.push(filePath)
            }
            if (stat.isDirectory() && (!exclude || exclude(parsedPath, stat)) && (depth === undefined || depth > 0)) {
                getFiles(filePath, judge, depth === undefined ? undefined : depth - 1)
            }
        }
    }
    _getFiles(path, judge, depthOrOptions)
    return result
}

/** 删除 ESLint 配置文件 */
export function removeESLint() {
    try {
        const files = getFiles(cwd(), (path, stats) => /\.eslintrc\.[cm]?js/.test(path.base) && stats.isFile(), {
            depth: 1,
            exclude: path => path.base !== "node_modules"
        })
        files.forEach(file => {
            try {
                unlinkSync(file)
            } catch (error) {
                consola.fail(`删除 ${file} 失败`)
            }
        })
        consola.success("删除 ESLint 配置文件成功")
    } catch (error) {
        consola.error(error)
        consola.fail("获取 ESLint 配置文件列表失败")
    }
    try {
        const pkg = readPackageJson()
        Object.keys(pkg.dependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.dependencies[key]
        })
        Object.keys(pkg.devDependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.devDependencies[key]
        })
        writePackageJson(pkg)
        consola.success("删除 ESLint 依赖成功")
    } catch (error) {
        consola.fail("删除 ESLint 依赖失败")
    }
}

export function vite() {
    setTsConfig("noUnusedLocals")
    setTsConfig("noUnusedParameters")
    const pkg = readPackageJson()
    pkg.scripts.dev = "vite --host"
    writePackageJson(pkg)
}

/** 添加 tailwind.config.js 配置成功 */
export function addTailwindConfig() {
    try {
        writeFileSync(
            getAbsolutePath("tailwind.config.js"),
            `/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
    extend: {},
    },
    plugins: [],
}`,
            "utf-8"
        )
        consola.success("添加 tailwind.config.js 配置成功")
    } catch (error) {
        consola.fail("添加 tailwind.config.js 配置失败")
    }
}

/** 添加 postcss.config.js 配置成功 */
export function addPostCSSConfig() {
    try {
        writeFileSync(
            getAbsolutePath("postcss.config.cjs"),
            `module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {}
    }
}`,
            "utf-8"
        )
        consola.success("添加 postcss.config.js 配置成功")
    } catch (error) {
        consola.fail("添加 postcss.config.js 配置失败")
    }
}

/** 添加 tailwind 至 index.css 成功 */
export function addTailwindToCSS() {
    try {
        const dir = getAbsolutePath("./src")
        const files = getFiles(dir, (path, stats) => (path.base.toLowerCase() === "index.css" || path.base.toLowerCase() === "app.css") && stats.isFile(), { depth: 1 })
        if (files.length === 0) throw new Error("未找到 index.css 或 app.css")
        const file = files.find(file => file.endsWith("index.css") || file.endsWith("app.css"))!
        const css = readFileSync(file, "utf-8")
        if (css.includes("@tailwind")) {
            consola.warn("index.css 或 app.css 已经包含 @tailwind")
            return
        }
        writeFileSync(
            getAbsolutePath("./src/index.css"),
            `@tailwind base;    
@tailwind components;
@tailwind utilities;

${css}`,
            "utf-8"
        )
        consola.success("添加 tailwind 至 index.css 成功")
    } catch (error) {
        consola.fail("添加 tailwind 至 index.css 失败")
    }
}

export const prettierConfig: Config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 800,
    trailingComma: "none"
}

export const prettierConfigText = `module.exports = ${JSON.stringify(prettierConfig, undefined, 4)}`

export const prettierConfigTextWithTailwind = `module.exports = ${JSON.stringify({ plugins: ["prettier-plugin-tailwindcss"], ...prettierConfig }, undefined, 4)}`

/** 添加 prettier 配置成功 */
export function addPrettierConfig(tailwind?: boolean) {
    try {
        writeFileSync(getAbsolutePath("./prettier.config.cjs"), tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
        consola.success("添加 prettier 配置成功")
    } catch (error) {
        consola.fail("添加 prettier 配置失败")
    }
}

/** 配置 tailwind */
export async function tailwind() {
    const pkg = readPackageJson()
    await addDevDependencies(pkg, "tailwindcss")
    await addDevDependencies(pkg, "autoprefixer")
    await addDevDependencies(pkg, "postcss")
    await addDevDependencies(pkg, "prettier")
    await addDevDependencies(pkg, "prettier-plugin-tailwindcss")
    writePackageJson(pkg)
    addTailwindConfig()
    addPostCSSConfig()
    addTailwindToCSS()
    addPrettierConfig(true)
}

export function removeComment(path: string) {
    try {
        const text = readFileSync(getAbsolutePath(path), "utf-8")
        const newText = text.replace(/^ *?\/\/.*?$/gm, "")
        writeFileSync(getAbsolutePath(path), newText, "utf-8")
        consola.success("删除注释成功")
    } catch (error) {
        consola.fail("删除注释失败")
    }
}

export enum Target {
    ES2015 = "ES2015",
    ES2016 = "ES2016",
    ES2017 = "ES2017",
    ES2018 = "ES2018",
    ES2019 = "ES2019",
    ES2020 = "ES2020",
    ES2021 = "ES2021",
    ES2022 = "ES2022",
    ES2023 = "ES2023",
    ES3 = "ES3",
    ES5 = "ES5",
    ES6 = "ES6",
    ESNext = "ESNext"
}

export enum Module {
    AMD = "AMD",
    CommonJS = "CommonJS",
    ES2015 = "ES2015",
    ES2020 = "ES2020",
    ES2022 = "ES2022",
    ES6 = "ES6",
    ESNext = "ESNext",
    Node16 = "Node16",
    NodeNext = "NodeNext",
    None = "None",
    System = "System",
    UMD = "UMD"
}

export enum ModuleResolution {
    Bundler = "Bundler",
    Classic = "Classic",
    Node = "Node",
    Node10 = "Node10",
    Node16 = "Node16",
    NodeNext = "NodeNext"
}

export function setTsConfig(key: string, value?: string | undefined) {
    const tsconfig = readTsConfigJSON()
    if (value === undefined) {
        delete tsconfig.compilerOptions[key]
    } else {
        if (key === "target") {
            const t = Object.values(Target).find(t => t.toLowerCase() === value.trim().toLowerCase())
            if (!t) {
                consola.fail("无效的 target 选项")
                exit()
            }
            tsconfig.compilerOptions.target = t
        } else if (key === "module") {
            const m = Object.values(Module).find(m => m.toLowerCase() === value.trim().toLowerCase())
            if (!m) {
                consola.fail("无效的 module 选项")
                exit()
            }
            tsconfig.compilerOptions.module = m
        } else if (key === "moduleResolution") {
            const mr = Object.values(ModuleResolution).find(mr => mr.toLowerCase() === value.trim().toLowerCase())
            if (!mr) {
                consola.fail("无效的 moduleResolution 选项")
                exit()
            }
            tsconfig.compilerOptions.moduleResolution = mr
        } else {
            consola.fail(`暂不支持 ${key} 项`)
            exit()
        }
    }
    writeFileSync(getTsConfigJsonPath(), JSON.stringify(tsconfig, undefined, 4), "utf-8")
    consola.success(`修改 ${key} 成功`)
}

export function sortArrayOrObject(data: any) {
    if (typeof data !== "object" || data === null) return data
    if (Array.isArray(data)) {
        const _data = [...data]
        _data.sort()
        return _data
    }
    if (Object.getPrototypeOf(data) === Object.prototype) {
        const keys = Object.keys(data)
        keys.sort()
        const _data: Record<string, any> = {}
        for (const key of keys) {
            _data[key] = data[key]
        }
        return _data
    }
    return data
}

export async function install() {
    const install = await consola.prompt("是否立即安装", {
        type: "select",
        options: ["yarn", "pnpm", "npm", "no"],
        initial: "yarn"
    })
    if (install === "no") return
    const child = spawn(`${install} install`, { shell: true, stdio: "inherit" })
    await new Promise(resolve => child.on("close", resolve))
}
