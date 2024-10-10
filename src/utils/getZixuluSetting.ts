import { existsSync } from "fs"
import { readFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

export async function getZixuluSetting() {
    const userDir = homedir()
    const settingPath = join(userDir, ".zixulu.json")
    if (existsSync(settingPath)) {
        const setting = JSON.parse(await readFile(settingPath, "utf-8"))
        return setting
    }
    return {}
}
