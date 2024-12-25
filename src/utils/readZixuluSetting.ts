import { existsSync } from "fs"
import { readFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

export type ZixuluSetting = {
    vscodeDownloadHistory?: string[]
    softwareDownloadHistory?: string[]
    upgradeWorkspaceDependcenyHistory?: Record<string, string[]>
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
