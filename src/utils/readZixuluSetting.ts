import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import { EditorConfigType, SyncEditorSettingSource } from "./syncEditorSetting"

export interface SyncEditorFileConfig {
    backup?: boolean
}

export interface SyncEditorConfig {
    fileConfigs?: Record<string, SyncEditorFileConfig>
    types?: EditorConfigType[]
    source?: SyncEditorSettingSource
    targets?: SyncEditorSettingSource[]
    onlinePath?: string
}

export interface ZixuluSetting {
    vscodeDownloadHistory?: string[]
    softwareDownloadHistory?: string[]
    upgradeWorkspaceDependcenyHistory?: Record<string, string[]>
    syncEditor?: SyncEditorConfig
    verdaccioPath?: string
    templateProjects?: string[]
}

export async function readZixuluSetting(): Promise<ZixuluSetting> {
    const userDir = homedir()
    const settingPath = join(userDir, ".zixulu.json")

    if (existsSync(settingPath)) {
        const setting = JSON.parse(await readFile(settingPath, "utf-8"))
        return setting
    }

    return {}
}
