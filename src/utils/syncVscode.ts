import { copyFile, mkdir, readdir, rm, writeFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import consola from "consola"
import dayjs from "dayjs"
import { getEnumEntries, getEnumValues } from "deepsea-tools"

import { download } from "./download"
import { downloadVscodeExts } from "./downloadVscodeExts"

export enum VscodeSyncOption {
    "配置" = "SETTING",
    "插件" = "EXTENSION",
    "软件" = "SOFTWARE",
}

export async function syncVscode() {
    const { default: inquirer } = await import("inquirer")
    const options: VscodeSyncOption[] = (
        await inquirer.prompt({
            type: "checkbox",
            name: "options",
            message: "请选择要同步的内容",
            choices: getEnumEntries(VscodeSyncOption).map(([name, value]) => ({ name, value })),
            default: getEnumValues(VscodeSyncOption),
        })
    ).options
    if (options.length === 0) return
    const userDir = homedir()
    const snippetSource = join(userDir, "AppData/Roaming/Code/User/snippets")
    const setting = join(userDir, "AppData/Roaming/Code/User/settings.json")
    const dir = `vscode-${dayjs().format("YYYYMMDDHHmmss")}`
    try {
        await mkdir(dir, { recursive: true })

        if (options.includes(VscodeSyncOption.配置)) {
            const snippetTarget = join(dir, "snippets")
            await mkdir(snippetTarget, { recursive: true })
            consola.start("开始下载最新 VSCode 配置")
            await copyFile(setting, join(dir, "settings.json"))
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
    }
`
                    : ""
            }}

main()`
            await writeFile(join(dir, "syncVscode.mjs"), script, "utf-8")
        }

        if (options.includes(VscodeSyncOption.软件)) {
            consola.start("开始下载最新 VSCode")
            await download(`https://code.visualstudio.com/sha/download?build=stable&os=win32-x64`, dir)
            consola.success("下载最新 VSCode 完成")
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
