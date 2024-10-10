import consola from "consola"
import dayjs from "dayjs"
import { copyFile, mkdir, readdir } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import { downloadVscode, downloadVscodeExts, writeSyncVscodeScript } from "."

export async function syncVscode() {
    const { default: inquirer } = await import("inquirer")
    const userDir = homedir()
    const snippetSource = join(userDir, "AppData/Roaming/Code/User/snippets")
    const setting = join(userDir, "AppData/Roaming/Code/User/settings.json")
    const dir = `vscode-${dayjs().format("YYYYMMDDHHmmss")}`
    await mkdir(dir, { recursive: true })
    const snippetTarget = join(dir, "snippets")
    await mkdir(snippetTarget, { recursive: true })
    consola.start("开始下载最新 VSCode 配置")
    await copyFile(setting, join(dir, "settings.json"))
    const files = await readdir(snippetSource)
    for (const file of files) await copyFile(join(snippetSource, file), join(snippetTarget, file))
    consola.success("下载最新 VSCode 配置完成")
    await downloadVscodeExts(join(dir, "extensions"))
    consola.success("下载最新 VSCode 插件完成")
    await writeSyncVscodeScript(dir)
    const { vscode } = await inquirer.prompt({
        type: "confirm",
        name: "vscode",
        message: "是否下载最新版 VSCode",
    })
    if (vscode) {
        consola.start("开始下载最新 VSCode")
        await downloadVscode(dir)
        consola.success("下载最新 VSCode 完成")
    }
}
