import { execAsync } from "soda-nodejs"

import type { Editor, SyncEditorSettingSource } from "./syncEditorSetting"

export const EditorExtensionCommandMap = {
    Code: "code",
    Cursor: "cursor",
    Antigravity: "antigravity",
} as const

export interface GetEditorExtensionsParams {
    source: SyncEditorSettingSource
}

export interface GetEditorExtensionCommandParams {
    editor: Editor
}

export async function canGetEditorExtensions({ editor }: GetEditorExtensionCommandParams) {
    const command = getEditorExtensionCommand({ editor })

    try {
        await execAsync(`${command} --version`)
        return true
    } catch {
        return false
    }
}

export function getEditorExtensionCommand({ editor }: GetEditorExtensionCommandParams) {
    return EditorExtensionCommandMap[editor]
}

export async function getEditorExtensions({ source }: GetEditorExtensionsParams) {
    let data: string[] = []

    if (source !== "Online") {
        const command = getEditorExtensionCommand({ editor: source })
        const output = await execAsync(`${command} --list-extensions`)
        data = output
            .split("\n")
            .map(item => item.trim())
            .filter(Boolean)
    } else {
        const response = await fetch("https://luzixu.geskj.com/extensions.json")
        data = await response.json()
    }

    data = data.filter(item => !item.startsWith("anysphere.") && item !== "github.copilot" && item !== "github.copilot-chat")

    return new Set(data)
}
