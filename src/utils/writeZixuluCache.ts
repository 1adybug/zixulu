import { writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import { ZixuluCache } from "./readZixuluCache"

export async function writeZixuluCache(cache: ZixuluCache) {
    const userDir = homedir()
    const cachePath = join(userDir, ".zixulu.json")
    await writeFile(cachePath, JSON.stringify(cache, undefined, 4), "utf-8")
}
