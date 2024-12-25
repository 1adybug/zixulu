import { writeFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

import { ZixuluCache } from "./readZixuluCache"

export async function writeZixuluCache(cache: ZixuluCache) {
    const userDir = homedir()
    const cachePath = join(userDir, ".zixulu.json")
    await writeFile(cachePath, JSON.stringify(cache, undefined, 4), "utf-8")
}
