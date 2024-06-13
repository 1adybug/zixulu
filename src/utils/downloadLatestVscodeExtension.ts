import consola from "consola"
import { copyFile, mkdir } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import { downloadVscodeExts, writeInstallVscodeExtScript } from "."

export async function downloadLatestVscodeExtension() {
    const { default: inquirer } = await import("inquirer")
    const userDir = homedir()
    const snippet = join(userDir, "AppData/Roaming/Code/User/snippets/global.code-snippets")
    const setting = join(userDir, "AppData/Roaming/Code/User/settings.json")
    const dir = `vscode-${Date.now()}`
    await mkdir(dir, { recursive: true })
    consola.start("开始下载最新 VSCode 配置")
    await copyFile(snippet, join(dir, "global.code-snippets"))
    await copyFile(setting, join(dir, "settings.json"))
    consola.success("下载最新 VSCode 配置完成")
    await downloadVscodeExts(dir)
    consola.success("下载最新 VSCode 插件完成")
    await writeInstallVscodeExtScript(dir)
    const { downloadVscode } = await inquirer.prompt({
        type: "confirm",
        name: "downloadVscode",
        message: "是否下载最新版 VSCode"
    })
    if (downloadVscode) {
        consola.start("开始下载最新 VSCode")
        await downloadVscode(dir)
        consola.success("下载最新 VSCode 完成")
    }
}
