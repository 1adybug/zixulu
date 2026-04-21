import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import consola from "consola"
import dayjs from "dayjs"
import { getEnumEntries, getEnumValues } from "deepsea-tools"
import inquirer from "inquirer"

import { download } from "./download"
import { downloadVscodeExts } from "./downloadVscodeExts"

export const VscodeSyncOption = {
    配置: "SETTING",
    插件: "EXTENSION",
    软件: "SOFTWARE",
    PowerShell: "POWERSHELL",
} as const

export type VscodeSyncOption = (typeof VscodeSyncOption)[keyof typeof VscodeSyncOption]

export interface SyncVscodeClearPromptResult {
    clear: boolean
}

export function createSyncVscodeScript(options: VscodeSyncOption[]) {
    const needUserDir = options.includes(VscodeSyncOption.配置) || options.includes(VscodeSyncOption.PowerShell)

    return `// @ts-check

import { spawn } from "node:child_process"
import { access, copyFile, mkdir, readdir, rm } from "node:fs/promises"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"

/**
 * @param {string} path
 */
async function pathExists(path) {
    try {
        await access(path)
        return true
    } catch {
        return false
    }
}

// Windows 上优先查找真实的 code.cmd，避免 shell 拼命令时的路径问题
async function resolveCodeCli() {
    if (process.platform !== "win32") return "code"

    const candidates = new Set()
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local")
    const programFiles = process.env.ProgramFiles ?? "C:/Program Files"
    const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:/Program Files (x86)"

    candidates.add(join(localAppData, "Programs", "Microsoft VS Code", "bin", "code.cmd"))
    candidates.add(join(programFiles, "Microsoft VS Code", "bin", "code.cmd"))
    candidates.add(join(programFilesX86, "Microsoft VS Code", "bin", "code.cmd"))

    const pathDirs = process.env.PATH?.split(delimiter).filter(Boolean) ?? []
    for (const dir of pathDirs) {
        candidates.add(join(dir, "code.cmd"))
        candidates.add(join(dir, "code.exe"))
        candidates.add(join(dir, "code"))
    }

    for (const candidate of candidates) {
        if (await pathExists(candidate)) return candidate
    }

    throw new Error("未找到 VS Code 命令行工具，请先安装 VS Code，并确认安装时勾选了“添加到 PATH”")
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function spawnAsync(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: "inherit" })
        child.on("error", reject)
        child.on("exit", code => {
            if (code !== 0) return reject(new Error(\`Command failed with code \${code}: \${command} \${args.join(" ")}\`))
            resolve(0)
        })
    })
}

async function main() {
    const workspaceDir = process.cwd()
${
    needUserDir
        ? `    const userDir = homedir()
`
        : ""
}${
        options.includes(VscodeSyncOption.插件)
            ? `    const extensionsDir = join(workspaceDir, "extensions")
    const codeCli = await resolveCodeCli()
    const dir = await readdir(extensionsDir)
    for (const ext of dir) {
        await spawnAsync(codeCli, ["--install-extension", join(extensionsDir, ext)])
    }
`
            : ""
    }${
        options.includes(VscodeSyncOption.配置)
            ? `    const codeUserDir = join(userDir, "AppData", "Roaming", "Code", "User")
    await mkdir(codeUserDir, { recursive: true })
    const setting = join(codeUserDir, "settings.json")
    await rm(setting, { force: true })
    await copyFile(join(workspaceDir, "settings.json"), setting)
    const snippetTarget = join(codeUserDir, "snippets")
    await mkdir(snippetTarget, { recursive: true })
    const dir2 = await readdir(join(workspaceDir, "snippets"))
    for (const file of dir2) {
        await rm(join(snippetTarget, file), { force: true })
        await copyFile(join(workspaceDir, "snippets", file), join(snippetTarget, file))
    }`
            : ""
    }${
        options.includes(VscodeSyncOption.PowerShell)
            ? `
    const profileDir = join(userDir, "Documents", "PowerShell")
    await mkdir(profileDir, { recursive: true })
    const profile = join(profileDir, "Microsoft.PowerShell_profile.ps1")
    await copyFile(join(workspaceDir, "Microsoft.PowerShell_profile.ps1"), profile)`
            : ""
    }
}

main()
`
}

export async function syncVscode() {
    const options: VscodeSyncOption[] = (
        await inquirer.prompt({
            type: "checkbox",
            name: "options",
            message: "请选择要同步的内容",
            choices: getEnumEntries(VscodeSyncOption).map(([name, value]) => ({
                name,
                value,
            })),
            default: getEnumValues(VscodeSyncOption),
        })
    ).options
    if (options.length === 0) return
    const userDir = homedir()
    const codeUserDir = join(userDir, "AppData", "Roaming", "Code", "User")
    const snippetSource = join(codeUserDir, "snippets")
    const setting = (await readFile(join(codeUserDir, "settings.json"), "utf-8")).replace(/}[ \n\r]*$/, `    "chat.disableAIFeatures": true,\n}`)
    const dir = `vscode-${dayjs().format("YYYYMMDDHHmmss")}`

    try {
        await mkdir(dir, { recursive: true })

        if (options.includes(VscodeSyncOption.配置)) {
            const snippetTarget = join(dir, "snippets")
            await mkdir(snippetTarget, { recursive: true })
            consola.start("开始下载最新 VSCode 配置")
            await writeFile(join(dir, "settings.json"), setting, "utf-8")
            const files = await readdir(snippetSource)
            for (const file of files) await copyFile(join(snippetSource, file), join(snippetTarget, file))
            consola.success("下载最新 VSCode 配置完成")
        }

        if (options.includes(VscodeSyncOption.插件)) {
            await downloadVscodeExts(join(dir, "extensions"))
            consola.success("下载最新 VSCode 插件完成")
        }

        if (options.includes(VscodeSyncOption.配置) || options.includes(VscodeSyncOption.插件) || options.includes(VscodeSyncOption.PowerShell)) {
            const script = createSyncVscodeScript(options)
            await writeFile(join(dir, "syncVscode.mjs"), script, "utf-8")
        }

        if (options.includes(VscodeSyncOption.软件)) {
            consola.start("开始下载最新 VSCode")
            await download(`https://code.visualstudio.com/sha/download?build=stable&os=win32-x64`, dir)
            consola.success("下载最新 VSCode 完成")
        }

        if (options.includes(VscodeSyncOption.PowerShell)) {
            consola.start("开始同步 PowerShell 配置")
            const userDir = homedir()
            const profile = join(userDir, "Documents/PowerShell/Microsoft.PowerShell_profile.ps1")
            const content = await readFile(profile, "utf-8")
            await writeFile(join(dir, "Microsoft.PowerShell_profile.ps1"), content.replace(/cursor|antigravity/g, "code"))
            consola.success("同步 PowerShell 配置成功")
        }
    } catch (error) {
        const { clear } = await inquirer.prompt<SyncVscodeClearPromptResult>({
            type: "confirm",
            name: "clear",
            message: "检测到错误，是否清理下载的文件",
            default: true,
        })
        if (clear) await rm(dir, { force: true, recursive: true })
        throw error
    }
}
