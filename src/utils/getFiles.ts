import { Stats } from "fs"
import { readdir, stat } from "fs/promises"
import { ParsedPath, join, parse } from "path"

export interface GetFilesOptions {
    /**
     * 目录
     */
    dir?: string
    /**
     * 匹配
     */
    match: (path: ParsedPath, stats: Stats) => boolean
    /**
     * 数量
     */
    count?: number
    /**
     * 深度
     */
    depth?: number
    /**
     * 排除
     */
    exclude?: (path: ParsedPath, stats: Stats) => boolean
}

export async function getFiles(options: GetFilesOptions) {
    const { dir = ".", match, count, depth, exclude } = options
    const result: string[] = []
    const e = Symbol()
    async function _getFiles(path: string, depth: number | undefined) {
        const files = await readdir(path)
        for (const file of files) {
            const filePath = join(path, file)
            const parsedPath = parse(filePath)
            const stats = await stat(filePath)
            if (match(parsedPath, stats)) {
                const length = result.push(filePath)
                if (count !== undefined && length >= count) throw e
            }
            if (!stats.isDirectory()) continue
            if (exclude && exclude(parsedPath, stats)) continue
            if (depth === 1) continue
            await _getFiles(filePath, depth && depth - 1)
        }
    }
    try {
        await _getFiles(dir, depth)
    } catch (error) {
        if (error !== e) throw error
    }
    return result
}
