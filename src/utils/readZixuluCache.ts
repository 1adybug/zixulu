import { existsSync } from "fs"
import { readFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

export type ZixuluCache = {
    sudoRequested?: boolean
}

export async function readZixuluCache(): Promise<ZixuluCache> {
    const userDir = homedir()
    const settingPath = join(userDir, ".zixulu.cache")
    if (existsSync(settingPath)) {
        const setting = JSON.parse(await readFile(settingPath, "utf-8"))
        return setting
    }
    return {}
}
