import { readdir, writeFile } from "fs/promises"
import { join, parse } from "path"

import { getEntryCssDir } from "./getEntryCssDir"

/**
 * 创建项目的入口 CSS 文件
 * 根据目录中是否存在 index/main 或 app 文件来决定 CSS 文件名
 * @param dir 目标目录
 * @returns CSS 文件的完整路径
 */
export async function createEntryCss(dir = ".") {
    const path = await getEntryCssDir(dir)
    const dir2 = await readdir(path)
    let hasIndex = false
    let hasApp = false
    for (const item of dir2) {
        const parsedPath = parse(item)
        if (!(parsedPath.ext === "ts" || parsedPath.ext === "tsx" || parsedPath.ext === "js" || parsedPath.ext === "jsx")) continue
        if (parsedPath.name.toLowerCase() === "index" || parsedPath.name.toLowerCase() === "main") hasIndex = true
        if (parsedPath.name.toLowerCase() === "app") hasApp = true
        if (hasIndex && hasApp) break
    }
    const cssPath = hasIndex || !hasApp ? join(path, "index.css") : join(path, "app.css")
    await writeFile(cssPath, "")
    return cssPath
}
