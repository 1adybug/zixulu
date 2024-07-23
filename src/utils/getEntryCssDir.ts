import { readdir, stat } from "fs/promises"
import { join } from "path"

/**
 * 获取入口 CSS 路径
 * @param dir 目录
 * @returns 入口 CSS 目录
 */
export async function getEntryCssDir(dir: string): Promise<string> {
    const dir2 = await readdir(dir)
    if (dir2.includes("app")) {
        const stats = await stat(join(dir, "app"))
        if (stats.isDirectory()) return getEntryCssDir(join(dir, "app"))
    }
    if (dir2.includes("src")) {
        const stats = await stat(join(dir, "src"))
        if (stats.isDirectory()) return getEntryCssDir(join(dir, "src"))
    }
    return dir
}
