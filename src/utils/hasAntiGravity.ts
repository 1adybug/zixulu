import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** 判断是否安装了 AntiGravity */
export function hasAntiGravity() {
    const userDir = homedir()
    const path = join(userDir, "AppData/Roaming/Antigravity")
    return existsSync(path)
}
