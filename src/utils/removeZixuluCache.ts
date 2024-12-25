import { rm } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

export async function removeZixuluCache() {
    const userDir = homedir()
    const cachePath = join(userDir, ".zixulu.cache")
    await rm(cachePath, { recursive: true, force: true })
}
