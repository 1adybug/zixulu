import { spawn } from "child_process"
import consola from "consola"
import { Stats, createWriteStream, readFileSync } from "fs"
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "fs/promises"
import * as JSON5 from "json5"
import { ParsedPath, isAbsolute, join, parse } from "path"
import { Config } from "prettier"
import { cwd, exit } from "process"
import { Readable } from "stream"
import YAML from "yaml"
import { HttpsProxyAgent } from "https-proxy-agent"

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
export async function writePackageJson(packageJson: Record<string, any>, path?: string) {
    try {
        await writeFile(getPackageJsonPath(path), JSON.stringify(packageJson, undefined, 4), "utf-8")
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

export async function getFiles(path: string, judge: (path: ParsedPath, stats: Stats) => boolean, depthOrOptions?: number | GetFilesOptions) {
    const result: string[] = []
    async function _getFiles(path: string, depthOrOptions?: number | GetFilesOptions) {
        const options: GetFilesOptions = typeof depthOrOptions === "number" ? { depth: depthOrOptions } : depthOrOptions ?? {}
        const { depth, exclude } = options
        path = getAbsolutePath(path)
        const files = await readdir(path)
        for (const file of files) {
            const filePath = join(path, file)
            const parsedPath = parse(filePath)
            const stats = await stat(filePath)
            if (judge(parsedPath, stats)) {
                result.push(filePath)
            }
            if (stats.isDirectory() && (!exclude || !exclude(parsedPath, stats)) && (depth === undefined || depth > 0)) {
                await _getFiles(filePath, {
                    depth: depth === undefined ? undefined : depth - 1,
                    exclude
                })
            }
        }
    }
    await _getFiles(path, depthOrOptions)
    return result
}

/** 删除 ESLint 配置文件 */
export async function removeESLint() {
    try {
        const files = await getFiles(cwd(), (path, stats) => /\.eslintrc\.[cm]?js/.test(path.base) && stats.isFile(), {
            depth: 1,
            exclude: path => path.base !== "node_modules"
        })
        for (const file of files) {
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
            getAbsolutePath("postcss.config.js"),
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

/** 添加 tailwind 至 index.css 成功 */
export async function addTailwindToCSS() {
    try {
        const dir = getAbsolutePath("./src")
        const files = await getFiles(dir, (path, stats) => (path.base.toLowerCase() === "index.css" || path.base.toLowerCase() === "app.css") && stats.isFile(), { depth: 1 })
        if (files.length === 0) throw new Error("未找到 index.css 或 app.css")
        const file = files.find(item => item.toLowerCase().endsWith("index.css")) || files.find(item => item.toLowerCase().endsWith("app.css"))!
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

/** 添加 prettier 配置成功 */
export async function addPrettierConfig() {
    try {
        const packageJson = await readPackageJson()
        const tailwind = Object.keys(packageJson.dependencies).includes("tailwindcss") || Object.keys(packageJson.devDependencies).includes("tailwindcss")
        await writeFile(getAbsolutePath("./prettier.config.cjs"), tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
        await addDevDependencies(packageJson, "prettier")
        await addDevDependencies(packageJson, "prettier-plugin-tailwindcss")
        await writePackageJson(packageJson)
        consola.success("添加 prettier 配置成功")
    } catch (error) {
        consola.fail("添加 prettier 配置失败")
    }
}

/** 配置 tailwind */
export async function tailwind() {
    const packageJson = await readPackageJson()
    await addDevDependencies(packageJson, "tailwindcss")
    await addDevDependencies(packageJson, "autoprefixer")
    await addDevDependencies(packageJson, "postcss")
    await addDevDependencies(packageJson, "prettier")
    await addDevDependencies(packageJson, "prettier-plugin-tailwindcss")
    await writePackageJson(packageJson)
    await addTailwindConfig()
    await addPostCSSConfig()
    await addTailwindToCSS()
    await addPrettierConfig()
}

export async function removeComment(path: string) {
    try {
        const text = await readFile(getAbsolutePath(path), "utf-8")
        const newText = text.replace(/^ *?\/\/.*?$/gm, "")
        await writeFile(getAbsolutePath(path), newText, "utf-8")
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

export async function install() {
    const install = await consola.prompt("是否立即安装", {
        type: "select",
        options: ["yarn", "pnpm", "npm", "no"],
        initial: "yarn"
    })
    if (install === "no") return
    await spawnAsync(`${install} install`)
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

export type SpawnAsyncOptions = {
    ignoreError?: boolean
    cwd?: string | URL | undefined
}

export function spawnAsync(command: string, options?: SpawnAsyncOptions) {
    console.log(command)
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
    await writeFile(getAbsolutePath("rsbuild.config.ts"), rsbuildConfig, "utf-8")
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
    try {
        await writeFile(getAbsolutePath("public/index.html"), indexHtml, "utf-8")
        consola.success("创建 index.html 成功")
    } catch (error) {
        await mkdir(getAbsolutePath("public"))
        try {
            await writeFile(getAbsolutePath("public/index.html"), indexHtml, "utf-8")
            consola.success("创建 index.html 成功")
        } catch (error) {
            consola.fail("创建 index.html 失败")
            exit()
        }
    }
}

export const addedRules = ["package-lock.json", "yarn.lock", "node_modules", "dist", "build", "pnpm-lock.yaml", "yarn-error.log"]

export async function addGitignore() {
    try {
        const files = await getFiles(cwd(), (path, stats) => path.base === ".gitignore" && stats.isFile(), { depth: 1 })
        const file = files.at(0)
        if (file) {
            const gitignore = await readFile(getAbsolutePath(".gitignore"), "utf-8")
            const newGitignore = `${gitignore}\n${addedRules.join("\n")}`
            await writeFile(getAbsolutePath(".gitignore"), newGitignore, "utf-8")
        } else {
            await writeFile(getAbsolutePath(".gitignore"), addedRules.join("\n"), "utf-8")
        }
    } catch (error) {
        consola.fail("添加 .gitignore 失败")
        exit()
    }
}

const agent = new HttpsProxyAgent("http://localhost:7890")

export function getFilename(headers: Headers) {
    const disposition = headers.get("content-disposition")
    if (!disposition) return undefined
    const reg = /filename=(.+?);/
    const result = disposition.match(reg)
    if (!result) return undefined
    return result[1]
}

export async function download(url: string, dir: string, filename?: string, suffix?: string) {
    const response = await fetch(url)
    filename = getFilename(response.headers) || filename || new URL(url).pathname.split("/").at(-1)!
    if (suffix) {
        const { name, ext } = parse(filename)
        filename = `${name}${suffix}${ext}`
    }
    const writeable = createWriteStream(join(dir, filename))
    await new Promise((resolve, reject) =>
        Readable.fromWeb(response.body as any)
            .pipe(writeable)
            .on("finish", resolve)
            .on("error", reject)
    )
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
}

export async function downloadFromWinget(dir: string, id: string) {
    const { default: fetch } = await import("node-fetch")
    const reg = /^(.+?)\.(.+?)$/
    const [, publisher, name] = id.match(reg)!
    const response = await fetch(`https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/${publisher[0].toLowerCase()}/${publisher}/${name}`, { agent })
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
    const response2 = await fetch(`https://raw.githubusercontent.com/microsoft/winget-pkgs/master/manifests/${publisher[0].toLowerCase()}/${publisher}/${name}/${stables[0].name}/${id}.installer.yaml`, { agent })
    const yaml = await response2.text()
    const pkg: Winget.Package = YAML.parse(yaml)
    const installers = pkg.Installers.filter((item, index) => (item.Architecture === "x64" || item.Architecture === "x86") && item.InstallerUrl.endsWith(".exe") && pkg.Installers.findIndex(item2 => item2.Architecture === item.Architecture) === index)
    const result: WingetItem[] = []
    for (const { InstallerUrl, Architecture } of installers) {
        if (Architecture !== "x64" && Architecture !== "x86") continue
        const filename = await download(InstallerUrl, dir, undefined, `_${Architecture}`)
        result.push({ filename, version: pkg.PackageVersion })
    }
    return result
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
    const result = await downloadFromWinget(dir, "Google.Chrome")
    for (const { version, filename } of result) {
        await sleep(100)
        await rename(join(dir, filename), join(dir, `Chrome_${version}_${filename.endsWith("_x64.exe") ? "x64" : "x86"}.exe`))
    }
}

export async function download7Zip(dir: string) {
    const result = await downloadFromWinget(dir, "7zip.7zip")
    for (const { version, filename } of result) {
        await sleep(100)
        await rename(join(dir, filename), join(dir, `7Zip_${version}_${filename.endsWith("_x64.exe") ? "x64" : "x86"}.exe`))
    }
}

export async function downloadDeskGo(dir: string) {
    await downloadFromPCQQ(dir, 3318, 23125)
}

export const vscodeExts: string[] = ["MS-CEINTL.vscode-language-pack-zh-hans", "russell.any-rule", "russell.any-type", "formulahendry.code-runner", "dsznajder.es7-react-js-snippets", "ms-vscode.vscode-typescript-next", "bierner.lit-html", "ritwickdey.LiveServer", "yzhang.markdown-all-in-one", "bierner.markdown-preview-github-styles", "mervin.markdown-formatter", "DavidAnson.vscode-markdownlint", "PKief.material-icon-theme", "techer.open-in-browser", "esbenp.prettier-vscode", "Prisma.prisma", "bradlc.vscode-tailwindcss", "styled-components.vscode-styled-components"]

export async function downloadVscodeExt(dir: string, ext: string) {
    const response = await fetch(`https://marketplace.visualstudio.com/items?itemName=${ext}`)
    const html = await response.text()
    const reg = /^(.+?)\.(.+?)$/
    const [, author, name] = ext.match(reg)!
    const reg2 = /"Version":"(.+?)"/
    const version = html.match(reg2)![1]
    const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${author}/vsextensions/${name}/${version}/vspackage`
    await download(url, dir, `${ext}-${version}.vsix`)
}

export async function downloadVscodeExts(dir: string) {
    for (const ext of vscodeExts) {
        await downloadVscodeExt(dir, ext)
    }
}
