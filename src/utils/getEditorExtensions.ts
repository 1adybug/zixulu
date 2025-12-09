import { execAsync } from "soda-nodejs"

import { SyncEditorSettingSource } from "./syncEditorSetting"

export interface GetEditorExtensionsParams {
    source: SyncEditorSettingSource
}

export async function getEditorExtensions({ source }: GetEditorExtensionsParams) {
    let data: string[] = []

    if (source !== "Online") {
        const output = await execAsync(`${source} --list-extensions`)
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
