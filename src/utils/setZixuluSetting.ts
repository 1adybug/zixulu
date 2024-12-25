import { writeFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

import { ZixuluSetting } from "./getZixuluSetting"

export async function setZixuluSetting(setting: ZixuluSetting) {
    const userDir = homedir()
    const settingPath = join(userDir, ".zixulu.json")
    await writeFile(settingPath, JSON.stringify(setting, undefined, 4), "utf-8")
}
