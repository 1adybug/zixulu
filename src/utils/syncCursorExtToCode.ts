import consola from "consola"
import { execAsync } from "soda-nodejs"

export async function syncCursorExtToCode() {
    const cursorOutput = await execAsync("cursor --list-extensions")
    const cursorExts = new Set(cursorOutput.split("\n").filter(item => !!item && !item.startsWith("anysphere.")))
    const vscodeOutput = await execAsync("code --list-extensions")
    const vscodeExts = new Set(vscodeOutput.split("\n").filter(Boolean))
    const installExts = cursorExts.difference(vscodeExts)
    for (const ext of installExts) await execAsync(`code --install-extension ${ext}`)
    const uninstallExts = vscodeExts.difference(cursorExts)
    for (const ext of uninstallExts) await execAsync(`code --uninstall-extension ${ext}`)
    consola.success("同步完成")
}
