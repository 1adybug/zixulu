import { writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import { ZixuluSetting } from "./readZixuluSetting"

export async function writeZixuluSetting(setting: ZixuluSetting) {
    const userDir = homedir()
    const settingPath = join(userDir, ".zixulu.json")
    await writeFile(settingPath, JSON.stringify(setting, undefined, 4), "utf-8")
}
