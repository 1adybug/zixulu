import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import consola from "consola"
import dayjs from "dayjs"
import { getEnumEntries, getEnumValues } from "deepsea-tools"
import inquirer from "inquirer"

import { download } from "./download"
import { downloadVscodeExts } from "./downloadVscodeExts"

export enum VscodeSyncOption {
    "配置" = "SETTING",
    "插件" = "EXTENSION",
    "软件" = "SOFTWARE",
    "PowerShell" = "POWERSHELL",
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
    const snippetSource = join(userDir, "AppData/Roaming/Code/User/snippets")
    const setting = (await readFile(join(userDir, "AppData/Roaming/Code/User/settings.json"), "utf-8")).replace(
        /}[ \n\r]*$/,
        `    "chat.disableAIFeatures": true,\n}`,
    )
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

        if (options.includes(VscodeSyncOption.配置) || options.includes(VscodeSyncOption.插件)) {
            const script = `// @ts-check

import { spawn } from "node:child_process"
import { readdir, copyFile, rm } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

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
${
    options.includes(VscodeSyncOption.插件)
        ? `    const dir = await readdir("./extensions")
    for (const ext of dir) {
        await spawnAsync(\`code --install-extension "./extensions/\${ext}"\`)
    }
`
        : ""
}${
                options.includes(VscodeSyncOption.配置)
                    ? `    const userDir = homedir()
    const setting = join(userDir, "AppData/Roaming/Code/User/settings.json")
    await rm(setting, { force: true })
    await copyFile("./settings.json", setting)
    const snippetTarget = join(userDir, "AppData/Roaming/Code/User/snippets")
    const dir2 = await readdir("./snippets")
    for (const file of dir2) {
        await rm(join(snippetTarget, file), { force: true })
        await copyFile(join("./snippets", file), join(snippetTarget, file))
    }`
                    : ""
            }${
                options.includes(VscodeSyncOption.PowerShell)
                    ? `
    ${
        options.includes(VscodeSyncOption.配置)
            ? ""
            : `const userDir = homedir()
`
    }const profile = join(userDir, "Documents/PowerShell/Microsoft.PowerShell_profile.ps1")
    await copyFile("./Microsoft.PowerShell_profile.ps1", profile)`
                    : ""
            }
}

main()`

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
        type PromptResult = {
            clear: boolean
        }

        const { clear } = await inquirer.prompt<PromptResult>({
            type: "confirm",
            name: "clear",
            message: "检测到错误，是否清理下载的文件",
            default: true,
        })
        if (clear) await rm(dir, { force: true, recursive: true })
        throw error
    }
}
