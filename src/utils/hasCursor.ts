import { existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

/** 判断是否安装了 Cursor */
export function hasCursor() {
    const userDir = homedir()
    const path = join(userDir, "AppData/Roaming/Cursor")
    return existsSync(path)
}
