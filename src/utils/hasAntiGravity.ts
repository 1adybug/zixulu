import { existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

/** 判断是否安装了 AntiGravity */
export function hasAntiGravity() {
    const userDir = homedir()
    const path = join(userDir, "AppData/Roaming/Antigravity")
    return existsSync(path)
}
