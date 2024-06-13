import consola from "consola"
import { copyFile, mkdir } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import { downloadVscode, downloadVscodeExts, writeInstallVscodeExtScript } from "."

export async function downloadLatestVscodeExtension() {
    consola.start("开始下载最新的 vscode 插件")
    const userDir = homedir()
    const snippet = join(userDir, "AppData/Roaming/Code/User/snippets/global.code-snippets")
    const setting = join(userDir, "AppData/Roaming/Code/User/settings.json")
    const dir = `vscode-${Date.now()}`
    await mkdir(dir, { recursive: true })
    await copyFile(snippet, join(dir, "global.code-snippets"))
    await copyFile(setting, join(dir, "settings.json"))
    await downloadVscode(dir)
    await downloadVscodeExts(dir)
    await writeInstallVscodeExtScript(dir)
    consola.success("下载最新的 vscode 插件完成")
}
