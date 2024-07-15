import { CommitType, CommitTypeMap, PackageManager } from "@constant/index"
import archiver from "archiver"
import { exec, spawn } from "child_process"
import consola from "consola"
import { Stats, createWriteStream, existsSync, readFileSync } from "fs"
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "fs/promises"
import { HttpsProxyAgent } from "https-proxy-agent"
import { type Headers as NodeFetchHeaders } from "node-fetch"
import { homedir } from "os"
import { ParsedPath, join, parse } from "path"
import { Config } from "prettier"
import { cwd, exit } from "process"
import { unzip } from "soda-nodejs"
import { Readable } from "stream"
import YAML from "yaml"
import { hasChangeNoCommit } from "./hasChangeNoCommit"

export function getPackageJsonPath(path?: string) {
    return join(path ?? cwd(), "package.json")
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

/** 写入依赖 */
export async function addDependencies(...packages: string[]): Promise<void> {
    try {
        const packageJson = await readPackageJson()
        packageJson.dependencies ??= {}
        for (const name of packages) {
            packageJson.dependencies[name] ??= `^${await getPackageLatestVersion(name)}`
            consola.success(`添加 ${name} 至依赖成功`)
        }
        const keys = Object.keys(packageJson.dependencies)
        keys.sort()
        const sortedDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDependencies[key] = packageJson.dependencies[key]
        }
        packageJson.dependencies = sortedDependencies
        await writePackageJson(packageJson)
    } catch (error) {
        consola.error(error)
        exit()
    }
}

/** 写入开发依赖 */
export async function addDevDependencies(...packages: string[]): Promise<void> {
    try {
        const packageJson = await readPackageJson()
        packageJson.devDependencies ??= {}
        for (const name of packages) {
            packageJson.devDependencies[name] ??= `^${await getPackageLatestVersion(name)}`
            consola.success(`添加 ${name} 至开发依赖成功`)
        }
        const keys = Object.keys(packageJson.devDependencies)
        keys.sort()
        const sortedDevDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDevDependencies[key] = packageJson.devDependencies[key]
        }
        packageJson.devDependencies = sortedDevDependencies
        await writePackageJson(packageJson)
    } catch (error) {
        consola.error(error)
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

/** 添加 tailwind.config.js 配置成功 */
export async function addTailwindConfig() {
    try {
        await writeFile(
            "tailwind.config.ts",
            `import type { Config } from "tailwindcss"
const config: Config = {
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

export default config
`,
            "utf-8"
        )
        consola.success("添加 tailwind.config.ts 配置成功")
    } catch (error) {
        consola.fail("添加 tailwind.config.ts 配置失败")
    }
}

/** 添加 postcss.config.js 配置 */
export async function addPostCSSConfig() {
    try {
        await rm("postcss.config.js", { force: true })
        await rm("postcss.config.mjs", { force: true })
        await rm("postcss.config.cjs", { force: true })
        await writeFile(
            "postcss.config.mjs",
            `/** @type {import("postcss-load-config").Config} */
const config = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {}
    }
}

export default config            
`,
            "utf-8"
        )
        consola.success("添加 postcss.config.mjs 配置成功")
    } catch (error) {
        consola.fail("添加 postcss.config.mjs 配置失败")
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

export const addedRules = ["package-lock.json", "yarn.lock", "node_modules", "dist", "build", "pnpm-lock.yaml", "yarn-error.log", "test.js", "test.mjs", "test.ts", "test"]

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
    await downloadFromWinget({
        name: "Code",
        id: "Microsoft.VisualStudioCode",
        dir
    })
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
        await rename(join(dir, filename), join(dir, `Supermium-${version}-${filename.endsWith("64_setup.exe") ? "x64" : "x86"}.exe`))
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
    if (!Array.isArray(data)) throw new Error((data as any).message)
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
    if (pkg.Installers.some(item => item.Scope === "machine")) pkg.Installers = pkg.Installers.filter(item => item.Scope === "machine")
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
        await rename(join(dir, filename), join(dir, `${name}-${version}-${architecture}.${ext}`))
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
        architecture: "x64"
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
        architecture: "x64"
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
    const dir2 = await readdir(dir)
    const file = dir2.find(item => item.startsWith("DeskGo"))!
    await rename(
        join(dir, file),
        join(
            dir,
            file.replace(/^DeskGo_(.+)_full\.exe$/, (match, arg) => `DeskGo-${arg.replace(/\_/g, ".")}-x64.exe`)
        )
    )
}

export async function downloadGeekUninstaller(dir: string) {
    await download(`https://geekuninstaller.com/geek.zip`, dir)
    await unzip({
        input: join(dir, "geek.zip"),
        output: dir
    })
    await rm(join(dir, "geek.zip"), { force: true })
    const response = await fetch("https://geekuninstaller.com/download")
    const text = await response.text()
    const version = text.match(/<b>(.+?)<\/b>/)![1]
    await rename(join(dir, "geek.exe"), join(dir, `GeekUninstaller-${version}-x64.exe`))
}

export async function getVscodeExtInfo(ext: string): Promise<VscodeExt> {
    const response = await fetch(`https://marketplace.visualstudio.com/items?itemName=${ext}`)
    const html = await response.text()
    const reg = /^(.+?)\.(.+?)$/
    const [, author, name] = ext.match(reg)!
    const reg2 = /"Version":"(.+?)"/
    const version = html.match(reg2)![1]
    const reg3 = /<span class="ux-item-name">(.+?)<\/span>/
    const displayName = html.match(reg3)![1]
    const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${author}/vsextensions/${name}/${version}/vspackage`
    return { id: ext, name: displayName, version, url }
    // await download(url, dir, `${ext}-${version}.vsix`)
}

export interface VscodeExt {
    id: string
    name: string
    version: string
    url: string
}

export async function downloadVscodeExts(dir: string) {
    await mkdir(dir, { recursive: true })
    const { default: inquirer } = await import("inquirer")
    consola.start("正在获取 VS Code 扩展列表")
    const extList = await execAsync("code --list-extensions")
    const exts = await Promise.all(
        extList
            .split(/[\n\r]/)
            .filter(Boolean)
            .map(ext => getVscodeExtInfo(ext))
    )
    const setting = await getSetting()
    const vscodeExts = setting?.vscodeExts as string[] | undefined
    const exts2 = await inquirer.prompt({
        type: "checkbox",
        name: "exts",
        message: "选择需要下载的扩展",
        choices: exts.map(ext => ({ name: ext.name, value: ext.id })),
        default: vscodeExts?.filter(ext => exts.some(item => item.id === ext)) || exts.map(ext => ext.id)
    })
    setting.vscodeExts = exts2.exts
    await setSetting(setting)
    for (const ext of exts) {
        if (!exts2.exts.includes(ext.id)) continue
        consola.start(`正在下载 ${ext.name}`)
        await retry(() => download(ext.url, dir, `${ext.id}-${ext.version}.vsix`), 2)
    }
}

export async function writeSyncVscodeScript(dir: string) {
    const script = `// @ts-check
import { spawn } from "child_process"
import { readdir, copyFile, rm } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

/** 
 * @param {string} command
 */
function spawnAsync(command) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, { shell: true, stdio: "inherit" })
        child.on("exit", code => {
            if (code !== 0) return reject(new Error(\`Command failed with code \${code}\`))
            resolve(0)
        })
    })
}

async function main() {
    const dir = await readdir("./extensions")
    for (const ext of dir) {
        await spawnAsync(\`code --install-extension "./extensions/\${ext}"\`)
    }
    const userDir = homedir()
    const setting = join(userDir, "AppData/Roaming/Code/User/settings.json")
    await rm(setting, { force: true })
    await copyFile("./settings.json", setting)
    const snippetTarget = join(userDir, "AppData/Roaming/Code/User/snippets")
    const dir2 = await readdir("./snippets")
    for (const file of dir2) {
        await rm(join(snippetTarget, file), { force: true })
        await copyFile(join("./snippets", file), join(snippetTarget, file))
    }
}

main()`
    await writeFile(join(dir, "syncVscode.mjs"), script, "utf-8")
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
        exec(`powershell -command command ${command}`, err => {
            resolve(!err)
        })
    })
}

export async function ifContinue(message = "是否继续"): Promise<boolean> {
    const { default: inquirer } = await import("inquirer")
    const { continue: cont } = await inquirer.prompt({
        type: "confirm",
        name: "continue",
        message
    })
    return cont
}

export async function isRepo() {
    try {
        await execAsync("git status")
        return true
    } catch (error) {
        return false
    }
}

/**
 * @param [forceRepo=false] 是否强制认为是 git 目录
 * @returns 如果是 git 目录且检测到未提交的更改，选择继续，则返回 true，否则返回 undefined
 */
export async function backupFirst(forceRepo = false): Promise<true | void> {
    if (!(await isRepo())) {
        if (forceRepo) {
            consola.error("git 不可用")
            exit()
        }
        consola.warn("强烈建议使用前备份代码")
        const cont = await ifContinue()
        if (!cont) exit()
        return
    }
    if (await hasChangeNoCommit()) {
        const { default: inquirer } = await import("inquirer")
        consola.warn("强烈建议使用前提交代码")
        const cont = await ifContinue()
        if (!cont) exit()
        return true
    }
}

export async function addGitCommit(message: string) {
    consola.start("提交代码")
    await execAsync("git add .")
    await execAsync(`git commit -m "${message}"`)
}

export function actionWithBackup<T extends (...args: any[]) => Promise<string>>(action: T, message?: string): (...args: Parameters<T>) => Promise<void>
export function actionWithBackup<T extends (...args: any[]) => Promise<void>>(action: T, message: string): (...args: Parameters<T>) => Promise<void>
export function actionWithBackup(action: (...args: any[]) => Promise<string | void>, message?: string) {
    return async (...args: any[]) => {
        const skip = await backupFirst()
        const msg = await action(...args)
        if (!(await isRepo()) || skip || !(await hasChangeNoCommit())) return
        const { default: inquirer } = await import("inquirer")
        const { commit } = await inquirer.prompt({
            type: "confirm",
            name: "commit",
            message: "是否自动提交代码",
            default: true
        })
        if (!commit) return
        let commitMessage: string
        if (typeof message === "string") commitMessage = message
        else if (typeof msg === "string") commitMessage = msg
        else {
            consola.warn("请提供提交信息")
            exit()
        }
        await addGitCommit(commitMessage)
    }
}

export function getCommitMessage(type: CommitType, message: string) {
    return `${CommitTypeMap[type]}${message}`
}

export async function getSetting() {
    const userDir = homedir()
    const settingPath = join(userDir, ".zixulu.json")
    if (existsSync(settingPath)) {
        const setting = JSON.parse(await readFile(settingPath, "utf-8"))
        return setting
    }
    return {}
}

export async function setSetting(setting: Record<string, any>) {
    const userDir = homedir()
    const settingPath = join(userDir, ".zixulu.json")
    await writeFile(settingPath, JSON.stringify(setting, undefined, 4), "utf-8")
}

export async function retry<T>(callback: () => Promise<T>, times = 1) {
    try {
        return await callback()
    } catch (error) {
        if (times === 0) throw error
        return await retry(callback, times - 1)
    }
}
