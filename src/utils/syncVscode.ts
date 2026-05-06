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

// Windows 上优先查找 code.cmd，避免直接调用 Code.exe 打开编辑器窗口
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
        candidates.add(join(dir, "code"))
    }

    for (const candidate of candidates) {
        if (await pathExists(candidate)) return candidate
    }

    throw new Error("未找到 VS Code 命令行工具，请先安装 VS Code，并确认安装时勾选了“添加到 PATH”")
}

/**
 * @param {string} value
 */
function quoteWindowsArg(value) {
    return "\\"" + value.replace(/"/g, "\\"\\"") + "\\""
}

/**
 * @param {string[]} args
 * @param {string} output
 */
function isCliCommandSuccessful(args, output) {
    if (args.includes("--install-extension")) return output.includes("was successfully installed.") || output.includes("is already installed.")
    if (args.includes("--uninstall-extension")) return output.includes("was successfully uninstalled.") || output.includes("is not installed.")
    return false
}

/**
 * @param {Buffer | string} data
 * @param {string[]} chunks
 * @param {NodeJS.WriteStream} stream
 */
function writeChildOutput(data, chunks, stream) {
    const text = data.toString()
    chunks.push(text)
    stream.write(text)
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function spawnAsync(command, args) {
    return new Promise((resolve, reject) => {
        // Windows 不能直接 spawn .cmd 或 .bat 文件，需要交给 cmd.exe 执行
        const needCmdShell = process.platform === "win32" && /\\.(cmd|bat)$/i.test(command)
        const chunks = []
        const child = needCmdShell
            ? spawn(
                  process.env.ComSpec ?? "cmd.exe",
                  ["/d", "/s", "/c", "\\"" + quoteWindowsArg(command) + " " + args.map(quoteWindowsArg).join(" ") + "\\""],
                  {
                      stdio: ["ignore", "pipe", "pipe"],
                      windowsVerbatimArguments: true,
                  },
              )
            : spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] })

        child.stdout?.on("data", data => writeChildOutput(data, chunks, process.stdout))
        child.stderr?.on("data", data => writeChildOutput(data, chunks, process.stderr))
        child.on("error", reject)
        child.on("exit", code => {
            const output = chunks.join("")

            if (code !== 0) {
                if (isCliCommandSuccessful(args, output)) {
                    console.warn(\`VS Code 命令退出码为 \${code}，但操作已完成，继续执行后续步骤\`)
                    return resolve(0)
                }

                return reject(new Error(\`Command failed with code \${code}: \${command} \${args.join(" ")}\`))
            }

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
    const extensionErrors = []
    for (const ext of dir) {
        try {
            await spawnAsync(codeCli, ["--install-extension", join(extensionsDir, ext), "--force"])
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            extensionErrors.push(\`\${ext}: \${message}\`)
            console.error(\`扩展同步失败：\${ext}\`)
        }
    }
    if (extensionErrors.length > 0) {
        throw new Error(\`以下扩展同步失败：\\n\${extensionErrors.join("\\n")}\`)
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
