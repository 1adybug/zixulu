import { rm } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export async function removeZixuluCache() {
    const userDir = homedir()
    const cachePath = join(userDir, ".zixulu.cache")
    await rm(cachePath, { recursive: true, force: true })
}
