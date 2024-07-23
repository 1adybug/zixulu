import { agent } from "@constant/index"
import consola from "consola"
import { createWriteStream, existsSync } from "fs"
import { mkdir, readFile, readdir, rename, rm, writeFile } from "fs/promises"
import { type Headers as NodeFetchHeaders } from "node-fetch"
import { homedir } from "os"
import { join } from "path"
import { Config } from "prettier"
import { execAsync, unzip } from "soda-nodejs"
import { Readable } from "stream"
import YAML from "yaml"
import { retry } from "./retry"

export function isPositiveInteger(value: any, allowZero = false): value is number {
    return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0)
}

export const prettierConfig: Config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 800,
    trailingComma: "none"
}

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
        name: "VSCode",
        id: "Microsoft.VisualStudioCode",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine"
    })
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
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
        Scope?: string
        InstallerUrl: string
        InstallerSha256: string
        InstallerLocale?: string
        InstallerType?: string
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
    filter: (item: Winget.Installer, index: number, arr: Winget.Installer[]) => boolean
}

export async function downloadFromWinget({ name, id, dir, filter }: WingetDownloadInfo) {
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

    const installers = filter ? pkg.Installers.filter(filter) : pkg.Installers

    if (installers.length === 0) {
        consola.warn(`未找到 ${name} 的安装程序`)
        return
    }

    const result: WingetItem[] = []

    for (const { InstallerUrl, Architecture } of installers) {
        const filename = await download(InstallerUrl, dir)
        result.push({ filename, version: pkg.PackageVersion, ext: new URL(InstallerUrl).pathname.endsWith(".exe") ? "exe" : "msi", architecture: Architecture })
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
        filter: item => item.Architecture === "x64"
    })
}

export async function downloadNodeJS(dir: string) {
    await downloadFromWinget({
        name: "NodeJS",
        id: "OpenJS.NodeJS.LTS",
        dir,
        filter: item => item.Architecture === "x64"
    })
}

export async function download7Zip(dir: string) {
    await downloadFromWinget({
        name: "7Zip",
        id: "7zip.7zip",
        dir,
        filter: item => item.Architecture === "x64" && item.InstallerType === "exe"
    })
}

export async function downloadGit(dir: string) {
    await downloadFromWinget({
        name: "Git",
        id: "Git.Git",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine"
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
    await rename(join(dir, "geek.exe"), join(dir, `Geek-${version}-x64.exe`))
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
        await retry(() => download(ext.url, dir, `${ext.id}-${ext.version}.vsix`), 4)
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
