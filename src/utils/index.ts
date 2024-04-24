import archiver from "archiver"
import { exec, spawn } from "child_process"
import consola from "consola"
import { Stats, createWriteStream, readFileSync } from "fs"
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "fs/promises"
import { HttpsProxyAgent } from "https-proxy-agent"
import * as JSON5 from "json5"
import { type Headers as NodeFetchHeaders } from "node-fetch"
import { ParsedPath, join, parse } from "path"
import { Config } from "prettier"
import { cwd, exit } from "process"
import { Readable } from "stream"
import YAML from "yaml"
import { PackageManager, Software } from "../constant"

export function getPackageJsonPath(path?: string) {
    return join(path ?? cwd(), "package.json")
}

export function getTsConfigJsonPath(path?: string) {
    return join(path ?? cwd(), "tsconfig.json")
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
    const reg = /^(\d+)(\.\d+)?(\.\d+)?/
    const result = version.match(reg)
    if (!result) throw new Error("无效的版本号")
    return Array.from(result)
        .slice(1)
        .map(str => (str ? parseInt(str.replace(/^\./, "")) : 0))
}

export async function getPackageUpgradeVersion(packageName: string, version: string, level: "major" | "minor" | "patch") {
    const current = getVersionNum(version)
    const versions = await getPackageVersions(packageName)
    const reg = /^\d+\.\d+\.\d+$/
    const result = versions
        .filter(item => {
            if (!reg.test(item)) return false
            const latest = getVersionNum(item)
            let index = -1
            for (let i = 0; i < latest.length; i++) {
                const cv = current[i]
                const lv = latest[i]
                if (lv < cv) break
                if (lv > cv) {
                    index = i
                    break
                }
            }
            if (index === -1) return false
            if (level === "major") return index >= 0
            if (level === "minor") return index >= 1
            if (level === "patch") return index >= 2
        })
        .map(item => getVersionNum(item))
    result.sort((a, b) => {
        for (let i = 0; i < a.length; i++) {
            if (a[i] < b[i]) return 1
            if (a[i] > b[i]) return -1
        }
        return 0
    })
    return result[0]?.join(".")
}

/** 读取 package.json */
export function readPackageJsonSync(path?: string): Record<string, any> {
    try {
        const result = JSON.parse(readFileSync(getPackageJsonPath(path), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 package.json 失败")
        exit()
    }
}

/** 读取 package.json */
export async function readPackageJson(path?: string): Promise<Record<string, any>> {
    try {
        const result = JSON.parse(await readFile(getPackageJsonPath(path), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 package.json 失败")
        exit()
    }
}

/** 读取 tsconfig.json */
export async function readTsConfigJSON(path?: string): Promise<Record<string, any>> {
    try {
        const result = JSON5.parse(await readFile(getTsConfigJsonPath(path), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 tsconfig.json 失败")
        exit()
    }
}

/** 写入依赖 */
export async function addDependencies(packageName: string, version?: string): Promise<void> {
    try {
        const packageJson = await readPackageJson()
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
        await writePackageJson(packageJson)
    } catch (error) {
        consola.error(error)
        consola.fail(`添加 ${packageName} 至依赖失败`)
        exit()
    }
}

/** 写入依赖 */
export async function addDevDependencies(packageName: string, version?: string): Promise<void> {
    try {
        const packageJson = await readPackageJson()
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
        await writePackageJson(packageJson)
    } catch (error) {
        consola.error(error)
        consola.fail(`添加 ${packageName} 至开发依赖失败`)
        exit()
    }
}

/** 写回 package.json */
export async function writePackageJson(packageJson: Record<string, any>, path?: string) {
    try {
        await writeFile(getPackageJsonPath(path), JSON.stringify(packageJson, undefined, 4), "utf-8")
        consola.success("修改 package.json 成功")
    } catch (error) {
        consola.fail("修改 package.json 失败")
        exit()
    }
}

export function isPositiveInteger(value: any, allowZero = false): value is number {
    return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0)
}

export interface GetFilesOptions {
    path?: string
    match: (path: ParsedPath, stats: Stats) => boolean
    count?: number
    depth?: number
    exclude?: (path: ParsedPath, stats: Stats) => boolean
}

export async function getFiles(options: GetFilesOptions) {
    const { path = "./", match, count, depth, exclude } = options
    if (count !== undefined && !isPositiveInteger(count)) throw new Error("count 必须是正整数")
    if (depth !== undefined && !isPositiveInteger(depth)) throw new Error("depth 必须是正整数")
    const result: string[] = []
    const e = Symbol()
    async function _getFiles(path: string, depth: number | undefined) {
        const files = await readdir(path)
        for (const file of files) {
            const filePath = join(path, file)
            const parsedPath = parse(filePath)
            const stats = await stat(filePath)
            if (match(parsedPath, stats)) {
                const length = result.push(filePath)
                if (count !== undefined && length >= count) throw e
            }
            if (!stats.isDirectory()) continue
            if (exclude && exclude(parsedPath, stats)) continue
            if (depth === 1) continue
            await _getFiles(filePath, depth && depth - 1)
        }
    }
    try {
        await _getFiles(path, depth)
    } catch (error) {
        if (error !== e) throw error
    }
    return result
}

/** 删除 ESLint 配置文件 */
export async function removeESLint() {
    try {
        const { default: inquirer } = await import("inquirer")
        const files = await getFiles({
            match: (path, stats) => path.base.toLowerCase().includes("eslint") && stats.isFile(),
            exclude: (path, stats) => path.base === "node_modules" && stats.isDirectory()
        })
        const { selectedFiles } = await inquirer.prompt({
            type: "checkbox",
            name: "selectedFiles",
            message: "选择要删除的文件",
            choices: files,
            default: files
        })

        for (const file of selectedFiles) {
            try {
                await rm(file, { force: true, recursive: true })
            } catch (error) {
                consola.fail(`删除 ${file} 失败`)
            }
        }
        consola.success("删除 ESLint 配置文件成功")
    } catch (error) {
        consola.error(error)
        consola.fail("获取 ESLint 配置文件列表失败")
    }
    try {
        const pkg = await readPackageJson()
        Object.keys(pkg.dependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.dependencies[key]
        })
        Object.keys(pkg.devDependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.devDependencies[key]
        })
        await writePackageJson(pkg)
        consola.success("删除 ESLint 依赖成功")
    } catch (error) {
        consola.fail("删除 ESLint 依赖失败")
    }
}

export async function vite() {
    await setTsConfig("noUnusedLocals")
    await setTsConfig("noUnusedParameters")
    const pkg = await readPackageJson()
    pkg.scripts.dev = "vite --host"
    await writePackageJson(pkg)
}

/** 添加 tailwind.config.js 配置成功 */
export async function addTailwindConfig() {
    try {
        await writeFile(
            "tailwind.config.js",
            `/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./public/index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
    extend: {},
    },
    plugins: [],
}
`,
            "utf-8"
        )
        consola.success("添加 tailwind.config.js 配置成功")
    } catch (error) {
        consola.fail("添加 tailwind.config.js 配置失败")
    }
}

/** 添加 postcss.config.js 配置 */
export async function addPostCSSConfig() {
    try {
        const packageJson = await readPackageJson()
        const autoprefixer = Object.keys(packageJson.dependencies).includes("autoprefixer") || Object.keys(packageJson.devDependencies).includes("autoprefixer")
        await writeFile(
            "postcss.config.cjs",
            `module.exports = {
    plugins: {
        tailwindcss: {}${
            autoprefixer
                ? `,
        autoprefixer: {}`
                : ""
        }
    }
}
`,
            "utf-8"
        )
        consola.success("添加 postcss.config.js 配置成功")
    } catch (error) {
        consola.fail("添加 postcss.config.js 配置失败")
    }
}

async function getEntryCssPath(path: string): Promise<string> {
    const dir = await readdir(path)
    if (dir.includes("app")) {
        const stats = await stat(join(path, "app"))
        if (stats.isDirectory()) return getEntryCssPath(join(path, "app"))
    }
    if (dir.includes("src")) {
        const stats = await stat(join(path, "src"))
        if (stats.isDirectory()) return getEntryCssPath(join(path, "src"))
    }
    return path
}

async function createEntryCss() {
    const path = await getEntryCssPath("./")
    const dir = await readdir(path)
    let hasIndex = false
    let hasApp = false
    for (const item of dir) {
        const parsedPath = parse(item)
        if (!(parsedPath.ext === "ts" || parsedPath.ext === "tsx" || parsedPath.ext === "js" || parsedPath.ext === "jsx")) continue
        if (parsedPath.name.toLowerCase() === "index" || parsedPath.name.toLowerCase() === "main") hasIndex = true
        if (parsedPath.name.toLowerCase() === "app") hasApp = true
        if (hasIndex && hasApp) break
    }
    const cssPath = hasIndex || !hasApp ? join(path, "index.css") : join(path, "app.css")
    await writeFile(cssPath, "")
    return cssPath
}

/** 添加 tailwind 至 index.css 成功 */
export async function addTailwindToCSS() {
    try {
        const files = await getFiles({
            match: (path, stats) => (path.base.toLowerCase() === "index.css" || path.base.toLowerCase() === "app.css" || path.base.toLowerCase() === "globals.css") && stats.isFile(),
            count: 1,
            exclude: (path, stats) => path.base === "node_modules" && stats.isDirectory()
        })
        if (files.length === 0) files.push(await createEntryCss())
        const file = files[0]
        const { base } = parse(file)
        const css = await readFile(file, "utf-8")
        if (css.includes("@tailwind")) {
            consola.warn(`${base} 已经包含 tailwind`)
            return
        }
        await writeFile(
            file,
            `@tailwind base;    
@tailwind components;
@tailwind utilities;

${css}`,
            "utf-8"
        )
        consola.success(`添加 tailwind 成功`)
    } catch (error) {
        console.log(error)
        consola.fail(`添加 tailwind 失败`)
    }
}

export const prettierConfig: Config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 800,
    trailingComma: "none"
}

export const prettierConfigText = `module.exports = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 800,
    trailingComma: "none"
}
`

export const prettierConfigTextWithTailwind = `module.exports = {
    plugins: ["prettier-plugin-tailwindcss"],
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 800,
    trailingComma: "none"
}
`

/** 添加 prettier */
export async function addPrettier() {
    try {
        const packageJson = await readPackageJson()
        const tailwind = Object.keys(packageJson.dependencies).includes("tailwindcss") || Object.keys(packageJson.devDependencies).includes("tailwindcss")
        await writeFile("./prettier.config.cjs", tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
        await addDevDependencies("prettier")
        await addDevDependencies("prettier-plugin-tailwindcss")
        consola.success("添加 prettier 配置成功")
    } catch (error) {
        consola.fail("添加 prettier 配置失败")
    }
}

/** 添加 tailwind */
export async function addTailwind() {
    try {
        await addDevDependencies("tailwindcss")
        await addDevDependencies("autoprefixer")
        await addDevDependencies("postcss")
        await addDevDependencies("prettier")
        await addDevDependencies("prettier-plugin-tailwindcss")
        await addTailwindConfig()
        await addPostCSSConfig()
        await addTailwindToCSS()
        await addPrettier()
        consola.success("添加 tailwind 成功")
    } catch (error) {
        consola.fail("添加 tailwind 失败")
    }
}

export async function removeComment(path: string) {
    try {
        const text = await readFile(path, "utf-8")
        const newText = text.replace(/^ *?\/\/.*?$/gm, "")
        await writeFile(path, newText, "utf-8")
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

export async function setTsConfig(key: string, value?: any) {
    const tsconfig = await readTsConfigJSON()
    if (value === undefined) {
        delete tsconfig.compilerOptions[key]
    } else {
        switch (key) {
            case "target":
                const t = Object.values(Target).find(t => t.toLowerCase() === value.trim().toLowerCase())
                if (!t) {
                    consola.fail("无效的 target 选项")
                    exit()
                }
                tsconfig.compilerOptions.target = t
                break
            case "module":
                const m = Object.values(Module).find(m => m.toLowerCase() === value.trim().toLowerCase())
                if (!m) {
                    consola.fail("无效的 module 选项")
                    exit()
                }
                tsconfig.compilerOptions.module = m
                break
            case "moduleResolution":
                const mr = Object.values(ModuleResolution).find(mr => mr.toLowerCase() === value.trim().toLowerCase())
                if (!mr) {
                    consola.fail("无效的 moduleResolution 选项")
                    exit()
                }
                tsconfig.compilerOptions.moduleResolution = mr
                break
            case "noEmit":
                tsconfig.compilerOptions.noEmit = !!value
                break
            default:
                consola.fail(`暂不支持 ${key} 项`)
                exit()
        }
    }
    await writeFile(getTsConfigJsonPath(), JSON.stringify(tsconfig, undefined, 4), "utf-8")
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

export async function installDependcies(silent?: boolean, manager?: PackageManager): Promise<boolean> {
    if (!silent) {
        const { default: inquirer } = await import("inquirer")
        const { install } = await inquirer.prompt({
            type: "confirm",
            name: "install",
            message: "安装依赖"
        })
        if (install === false) return false
    }
    manager ??= await getPackageManager()
    await spawnAsync(`${manager} install`)
    return true
}

export function getTypeInGenerics(str: string, start = 0) {
    if (str[start] !== "<") throw new Error("无效的泛型")
    let count = 1
    let index: number | undefined = undefined
    for (let i = start + 1; i < str.length; i++) {
        const w = str[i]
        if (w === "<") {
            count++
            continue
        }
        if (w === ">") {
            count--
            if (count === 0) {
                index = i
                break
            }
        }
    }
    if (index === undefined) throw new Error("无效的泛型")
    return str.slice(start + 1, index)
}

export type ExecAsyncOptions = {
    cwd?: string | URL | undefined
}

export type SpawnAsyncOptions = {
    ignoreError?: boolean
    cwd?: string | URL | undefined
}

export function execAsync(command: string, options?: ExecAsyncOptions) {
    consola.log(command)
    const { cwd } = options || {}
    return new Promise<string>((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) return reject(error)
            if (stderr) consola.warn(stderr)
            resolve(stdout)
        })
    })
}

export function spawnAsync(command: string, options?: SpawnAsyncOptions) {
    consola.log(command)
    const { ignoreError = false, cwd } = options || {}
    return new Promise<void>((resolve, reject) => {
        const child = spawn(command, { shell: true, stdio: "inherit", cwd })
        child.on("exit", code => {
            if (code !== 0 && !ignoreError) {
                reject(new Error(`Command failed with code ${code}`))
                return
            }
            resolve()
        })
    })
}

export function splitExtendsType(str: string) {
    const types: string[] = []
    let index = 0
    for (let i = 0; i < str.length; i++) {
        const w = str[i]
        if (w === "<") {
            const type = getTypeInGenerics(str, i)
            i += type.length + 1
            continue
        }
        if (w === ",") {
            types.push(str.slice(index, i))
            index = i + 1
        }
    }
    types.push(str.slice(index))
    return types.map(v => v.trim()).filter(v => v)
}

export const rsbuildConfig = `import { defineConfig } from "@rsbuild/core"
import { pluginReact } from "@rsbuild/plugin-react"

export default defineConfig({
    html: {
        template: "public/index.html"
    },
    plugins: [pluginReact()],
    server: {
        port: 5173
    },
    source: {
        define: {}
    }
})
`

export async function writeRsbuildConfig() {
    await writeFile("rsbuild.config.ts", rsbuildConfig, "utf-8")
}

export const indexHtml = `<!doctype html>
<html lang="zh">
    <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="/logo.webp" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="江苏格数科技有限公司" />
        <title>Hello, World!</title>
    </head>
    <body>
        <div id="root"></div>
    </body>
</html>
`

export async function createIndexHtml() {
    const dir = await readdir("./")
    let hasPublic = false
    if (dir.includes("public")) {
        const stats = await stat("public")
        if (stats.isDirectory()) hasPublic = true
    }
    if (!hasPublic) await mkdir("public", { recursive: true })
    await writeFile("public/index.html", indexHtml, "utf-8")
    consola.success("创建 index.html 成功")
}

export const addedRules = ["package-lock.json", "yarn.lock", "node_modules", "dist", "build", "pnpm-lock.yaml", "yarn-error.log", "test.js", "test.mjs", "test.ts"]

export async function addGitignore() {
    const dir = await readdir("./")
    if (!dir.includes(".gitignore")) return await writeFile(".gitignore", addedRules.join("\n"), "utf-8")
    const gitignore = await readFile(".gitignore", "utf-8")
    const rules = gitignore.split("\n").map(v => v.trim())
    for (const rule of addedRules) {
        if (rules.includes(rule)) continue
        rules.push(rule)
    }
    await writeFile(".gitignore", rules.join("\n"), "utf-8")
    consola.success("添加 .gitignore 成功")
}

const agent = new HttpsProxyAgent("http://localhost:7890")

export function getFilename(headers: Headers | NodeFetchHeaders) {
    const disposition = headers.get("content-disposition")
    if (!disposition) return undefined
    const reg = /filename=(.+?);/
    const result = disposition.match(reg)
    if (!result) return undefined
    return result[1]
}

export async function download(url: string, dir: string, filename?: string) {
    const { default: fetch } = await import("node-fetch")
    const response = await fetch(url, { agent })
    filename = getFilename(response.headers) || filename || new URL(url).pathname.split("/").at(-1)!
    const writeable = createWriteStream(join(dir, filename))
    await new Promise((resolve, reject) => Readable.from(response.body!).pipe(writeable).on("finish", resolve).on("error", reject))
    return filename
}

export async function downloadVscode(dir: string) {
    await download("https://code.visualstudio.com/sha/download?build=stable&os=win32-x64", dir, "vscode.exe")
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function downloadSupermium(dir: string) {
    const response = await fetch("https://win32subsystem.live/supermium/")
    const html = await response.text()
    const reg = /href=".+?setup\.exe"/g
    const matches = Array.from(html.match(reg) || [])
    const reg2 = /<b>Supermium (\d+(\.\d+)*)/
    const version = html.match(reg2)![1]
    for (let i = 0; i < matches.length; i++) {
        const str = matches[i]
        const url = new URL(str.slice(6, -1), "https://win32subsystem.live").href
        const filename = await download(url, dir)
        await sleep(100)
        await rename(join(dir, filename), join(dir, `Supermium_${version}_${filename.endsWith("64_setup.exe") ? "x64" : "x86"}.exe`))
    }
}

export namespace PCQQ {
    export interface Result {
        resp: Resp
    }

    export interface Resp {
        soft_list: Softlist[]
        retCode: number
    }

    export interface Softlist {
        soft_id: number
        os_type: number
        os_bit: number
        display_name: string
        nick_ver: string
        ver_name: string
        file_size: string
        file_name: string
        publish_date: string
        download_url: string
        download_https_url: string
    }
}

export async function downloadFromPCQQ(dir: string, cmdid: number, soft_id_list: number) {
    const data = new URLSearchParams()
    data.set("cmdid", cmdid.toString())
    data.set("jprxReq[req][soft_id_list][]", soft_id_list.toString())
    const headers = new Headers()
    headers.set("Content-Type", "application/x-www-form-urlencoded")
    const response = await fetch(`https://luban.m.qq.com/api/public/software-manager/softwareProxy`, { method: "POST", headers, body: data.toString() })
    const result: PCQQ.Result = await response.json()
    await download(result.resp.soft_list[0].download_https_url, dir, result.resp.soft_list[0].file_name)
}

export namespace Winget {
    export interface Package {
        PackageIdentifier: string
        PackageVersion: string
        InstallerType: string
        InstallModes: string[]
        InstallerSwitches: InstallerSwitches
        ExpectedReturnCodes: ExpectedReturnCode[]
        UpgradeBehavior: string
        Protocols: string[]
        FileExtensions: string[]
        AppsAndFeaturesEntries: AppsAndFeaturesEntry[]
        Installers: Installer[]
        ManifestType: string
        ManifestVersion: string
    }

    export interface Installer {
        Architecture: string
        Scope: string
        InstallerUrl: string
        InstallerSha256: string
        InstallerSwitches: InstallerSwitches2
        ProductCode: string
    }

    export interface InstallerSwitches2 {
        Custom: string
    }

    export interface AppsAndFeaturesEntry {
        UpgradeCode: string
        InstallerType: string
    }

    export interface ExpectedReturnCode {
        InstallerReturnCode: number
        ReturnResponse: string
    }

    export interface InstallerSwitches {
        Log: string
    }
}

export type WingetItem = {
    filename: string
    version: string
    ext: string
    architecture: string
}

export type WingetDownloadInfo = {
    name: string
    id: string
    dir: string
    architecture?: "x64" | "x86" | "all"
}

export async function downloadFromWinget({ name, id, dir, architecture = "x64" }: WingetDownloadInfo) {
    const { default: fetch } = await import("node-fetch")
    const firstLetter = id[0].toLowerCase()
    const path = id.replace(/\./g, "/")
    const response = await fetch(`https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/${firstLetter}/${path}`, { agent })
    const data: GithubContent[] = (await response.json()) as any
    const reg2 = /^\d+(\.\d+?)*$/
    const stables = data.filter(item => reg2.test(item.name))
    stables.sort((a, b) => {
        const avs = a.name.split(".")
        const bvs = b.name.split(".")
        const max = Math.max(avs.length, bvs.length)
        for (let i = 0; i < max; i++) {
            const av = avs[i] ? parseInt(avs[i]) : 0
            const bv = bvs[i] ? parseInt(bvs[i]) : 0
            if (av < bv) return 1
            if (av > bv) return -1
        }
        return 0
    })
    const response2 = await fetch(`https://raw.githubusercontent.com/microsoft/winget-pkgs/master/manifests/${firstLetter}/${path}/${stables[0].name}/${id}.installer.yaml`, { agent })
    const yaml = await response2.text()
    const pkg: Winget.Package = YAML.parse(yaml)
    const installers = pkg.Installers.filter((item, index) => {
        if (item.Architecture !== "x64" && item.Architecture !== "x86") return false
        if (architecture !== "all" && item.Architecture !== architecture) return false
        if (!item.InstallerUrl.endsWith(".exe") && !item.InstallerUrl.endsWith(".msi")) return false
        if (item.InstallerUrl.endsWith(".msi") && pkg.Installers.some(item2 => item2.Architecture === item.Architecture && item2.InstallerUrl.endsWith(".exe"))) return false
        if (pkg.Installers.findIndex(item2 => item2.Architecture === item.Architecture) !== index) return false
        return true
    })
    const result: WingetItem[] = []
    for (const { InstallerUrl, Architecture } of installers) {
        if (Architecture !== "x64" && Architecture !== "x86") continue
        const filename = await download(InstallerUrl, dir)
        result.push({ filename, version: pkg.PackageVersion, ext: InstallerUrl.endsWith(".exe") ? "exe" : "msi", architecture: Architecture })
    }
    for (const { version, filename, architecture, ext } of result) {
        await sleep(100)
        await rename(join(dir, filename), join(dir, `${name}_${version}_${architecture}.${ext}`))
    }
}

export interface GithubContent {
    name: string
    path: string
    sha: string
    size: number
    url: string
    html_url: string
    git_url: string
    download_url?: string | null
    type: string
    _links: Links
}

export interface Links {
    self: string
    git: string
    html: string
}

export async function downloadChrome(dir: string) {
    await downloadFromWinget({
        name: "Chrome",
        id: "Google.Chrome",
        dir,
        architecture: "all"
    })
}

export async function downloadNodeJS(dir: string) {
    await downloadFromWinget({
        name: "NodeJS",
        id: "OpenJS.NodeJS.LTS",
        dir
    })
}

export async function download7Zip(dir: string) {
    await downloadFromWinget({
        name: "7Zip",
        id: "7zip.7zip",
        dir,
        architecture: "all"
    })
}

export async function downloadGit(dir: string) {
    await downloadFromWinget({
        name: "Git",
        id: "Git.Git",
        dir
    })
}

export async function downloadDeskGo(dir: string) {
    await downloadFromPCQQ(dir, 3318, 23125)
}

export async function downloadGeekUninstaller(dir: string) {
    await download(`https://geekuninstaller.com/geek.zip`, dir)
}

export const vscodeExts: string[] = ["MS-CEINTL.vscode-language-pack-zh-hans", "russell.any-rule", "russell.any-type", "formulahendry.code-runner", "dsznajder.es7-react-js-snippets", "ms-vscode.vscode-typescript-next", "bierner.lit-html", "ritwickdey.LiveServer", "yzhang.markdown-all-in-one", "bierner.markdown-preview-github-styles", "mervin.markdown-formatter", "DavidAnson.vscode-markdownlint", "PKief.material-icon-theme", "techer.open-in-browser", "esbenp.prettier-vscode", "Prisma.prisma", "bradlc.vscode-tailwindcss", "styled-components.vscode-styled-components", "rioukkevin.vscode-git-commit"]

export async function downloadVscodeExt(dir: string, ext: string) {
    const response = await fetch(`https://marketplace.visualstudio.com/items?itemName=${ext}`)
    const html = await response.text()
    const reg = /^(.+?)\.(.+?)$/
    const [, author, name] = ext.match(reg)!
    const reg2 = /"Version":"(.+?)"/
    const version = html.match(reg2)![1]
    const reg3 = /<span class="ux-item-name">(.+?)<\/span>/
    const displayName = html.match(reg3)![1]
    consola.start(`正在下载 ${displayName}`)
    const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${author}/vsextensions/${name}/${version}/vspackage`
    await download(url, dir, `${ext}-${version}.vsix`)
}

export async function downloadVscodeExts(dir: string) {
    await mkdir(dir, { recursive: true })
    for (const ext of vscodeExts) {
        await downloadVscodeExt(dir, ext)
    }
}

export const SoftwareDownloadMap: Record<Software, (dir: string) => Promise<void>> = {
    [Software.Chrome]: downloadChrome,
    [Software.NodeJS]: downloadNodeJS,
    [Software["7zip"]]: download7Zip,
    [Software.Git]: downloadGit,
    [Software.DeskGo]: downloadDeskGo,
    [Software["Geek Uninstaller"]]: downloadGeekUninstaller,
    [Software["VS Code"]]: downloadVscode,
    [Software.Supermium]: downloadSupermium
}

export async function writeInstallVscodeExtScript(dir: string) {
    const script = `const { readdir } = require("fs/promises")
const { spawn } = require("child_process")

function spawnAsync(command) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, { shell: true, stdio: "inherit" })
        child.on("exit", code => {
            if (code !== 0) return reject(new Error(\`Command failed with code \${code}\`))
            resolve()
        })
    })
}

async function main() {
    const dir = await readdir("./")
    const exts = dir.filter(name => name.endsWith(".vsix"))
    for (const ext of exts) {
        await spawnAsync(\`code --install-extension "\${ext}"\`)
    }
}

main()`
    await writeFile(join(dir, "install.js"), script, "utf-8")
}

export async function getProcessInfoFromPid(pid: number) {
    try {
        const stdout = await execAsync(`tasklist | findstr ${pid}`)
        const reg = new RegExp(`( +)${pid}( (Services|Console) +)`)
        return stdout
            .split(/[\n\r]/)
            .find(line => reg.test(line))
            ?.replace(reg, "$1$2")
            ?.replace(/ +/g, " ")
    } catch (error) {
        return undefined
    }
}

export type PidInfo = {
    pid: number
    info: string
}

export async function getPidInfoFromPort(port: number) {
    try {
        const stdout = await execAsync(`netstat -ano | findstr :${port}`)
        const reg = new RegExp(` (\\[::\\]|(\\d{1,3}\\.){3}\\d{1,3}):${port} `)
        const result = Array.from(
            new Set(
                stdout
                    .split(/[\n\r]/)
                    .filter(line => reg.test(line))
                    .map(line => ({ pid: parseInt(line.match(reg)![1]), info: line }))
            )
        )
        for (let i = 0; ; ) {
            if (result.some(({ info }) => info[i] === undefined)) break
            if (result.some(({ info }) => info[i] !== " " || info[i + 1] !== " ")) {
                i++
                continue
            }
            result.forEach(item => (item.info = `${item.info.slice(0, i)}${item.info.slice(i + 1)}`))
        }
        return result
    } catch (error) {
        return []
    }
}

export function zipDir(sourceDir: string, outPath: string) {
    const archive = archiver("zip", { zlib: { level: 0 } }) // 设置压缩级别
    const stream = createWriteStream(outPath)

    return new Promise<void>((resolve, reject) => {
        archive
            .directory(sourceDir, false) // 添加整个目录到压缩文件
            .on("error", err => reject(err))
            .pipe(stream)

        stream.on("close", () => resolve())
        archive.finalize()
    })
}

export async function addAntd() {
    try {
        await addDependencies("@ant-design/cssinjs")
        await addDependencies("@ant-design/icons")
        await addDependencies("ahooks")
        await addDependencies("antd")
        const dir = await readdir("./")
        const componentDir = dir.includes("src") ? "src/components" : "components"
        await mkdir(componentDir, { recursive: true })
        const packageJson = await readPackageJson()
        if (packageJson.dependencies.next) {
            await addDependencies("@ant-design/nextjs-registry")
            await writeFile(
                join(componentDir, "AntdNextRegistry.tsx"),
                `"use client"
import { StyleProvider } from "@ant-design/cssinjs"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import { FC, ReactNode } from "react"

export type AntdNextRegistryProps = {
    children?: ReactNode
}

const AntdNextRegistry: FC<AntdNextRegistryProps> = props => {
    const { children } = props

    return (
        <AntdRegistry>
            <ConfigProvider locale={zhCN}>
                <StyleProvider hashPriority="high">{children}</StyleProvider>
            </ConfigProvider>
        </AntdRegistry>
    )
}

export default AntdNextRegistry
`
            )
        } else {
            await writeFile(
                join(componentDir, "AntdRegistry.tsx"),
                `"use client"
import { StyleProvider } from "@ant-design/cssinjs"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import { FC, ReactNode } from "react"

export type AntdRegistryProps = {
    children?: ReactNode
}

const AntdRegistry: FC<AntdRegistryProps> = props => {
    const { children } = props

    return (
        <ConfigProvider locale={zhCN}>
            <StyleProvider hashPriority="high">{children}</StyleProvider>
        </ConfigProvider>
    )
}

export default AntdRegistry
`
            )
        }
        consola.success("添加 antd 成功")
    } catch (error) {
        consola.fail("添加 antd 失败")
    }
}

export async function addPrisma(manager?: PackageManager) {
    try {
        await addDependencies("@prisma/client")
        await addDevDependencies("prisma")
        await addDevDependencies("ts-node")
        await addDevDependencies("@types/node")
        await addDevDependencies("typescript")
        const dir = await readdir("./")
        await installDependcies(true, manager)
        if (!dir.includes("tsconfig.json")) await spawnAsync("npx tsc --init")
        await spawnAsync("npx prisma init --datasource-provider sqlite")
        consola.success("添加 Prisma 成功")
    } catch (error) {
        consola.fail("添加 Prisma 失败")
    }
}

export async function getPackageManager(): Promise<PackageManager> {
    const dir = await readdir("./")
    if (dir.includes("yarn.lock")) return PackageManager.yarn
    if (dir.includes("package-lock.json")) return PackageManager.npm
    if (dir.includes("pnpm-lock.yaml")) return PackageManager.pnpm
    if (dir.includes("bun.lockb")) return PackageManager.bun
    const { default: inquirer } = await import("inquirer")
    const { manager } = await inquirer.prompt({
        type: "list",
        name: "manager",
        message: "请选择包管理器",
        choices: ["yarn", "npm", "pnpm", "bun"]
    })
    return manager as PackageManager
}

export async function isCommandExisted(command: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
        exec(`command ${command}`, err => {
            resolve(!err)
        })
    })
}
