import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** 判断是否安装了 Cursor */
export function hasCursor() {
    const userDir = homedir()
    const path = join(userDir, "AppData/Roaming/Cursor")
    return existsSync(path)
}
