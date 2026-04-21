import consola from "consola"
import { execAsync } from "soda-nodejs"

import { canGetEditorExtensions, getEditorExtensionCommand, getEditorExtensions } from "./getEditorExtensions"

export async function syncCursorExtToCode() {
    const canReadCursorExtensions = await canGetEditorExtensions({ editor: "Cursor" })

    if (!canReadCursorExtensions) throw new Error("Cursor 命令不可用，无法读取扩展列表，请确认已安装并加入 PATH")

    const canReadCodeExtensions = await canGetEditorExtensions({ editor: "Code" })

    if (!canReadCodeExtensions) throw new Error("Code 命令不可用，无法读取扩展列表，请确认已安装并加入 PATH")

    const cursorExts = await getEditorExtensions({ source: "Cursor" })
    const vscodeExts = await getEditorExtensions({ source: "Code" })
    const codeCommand = getEditorExtensionCommand({ editor: "Code" })
    const installExts = cursorExts.difference(vscodeExts)

    for (const ext of installExts) await execAsync(`${codeCommand} --install-extension ${ext}`)

    const uninstallExts = vscodeExts.difference(cursorExts)

    for (const ext of uninstallExts) await execAsync(`${codeCommand} --uninstall-extension ${ext}`)

    consola.success("同步完成")
}
