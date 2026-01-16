import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

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
