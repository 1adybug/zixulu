import { existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

/** 判断是否安装了 VSCode */
export function hasCode() {
    const userDir = homedir()
    const path = join(userDir, "AppData/Roaming/Code")
    return existsSync(path)
}
