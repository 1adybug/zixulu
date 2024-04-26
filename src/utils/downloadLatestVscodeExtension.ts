import consola from "consola"
import { mkdir } from "fs/promises"
import { downloadVscodeExts, writeInstallVscodeExtScript } from "."

export async function downloadLatestVscodeExtension() {
    consola.start("开始下载最新的 vscode 插件")
    const dir = `vscode-${Date.now()}`
    await mkdir(dir, { recursive: true })
    await downloadVscodeExts(dir)
    await writeInstallVscodeExtScript(dir)
    consola.success("下载最新的 vscode 插件完成")
}
