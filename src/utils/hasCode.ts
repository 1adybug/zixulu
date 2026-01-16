import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** 判断是否安装了 VSCode */
export function hasCode() {
    const userDir = homedir()
    const path = join(userDir, "AppData/Roaming/Code")
    return existsSync(path)
}
