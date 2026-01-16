import { Stats } from "node:fs"
import { readdir, stat } from "node:fs/promises"
import { join, parse, ParsedPath } from "node:path"

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

/**
 * 递归获取指定目录下的文件
 * @param options 配置选项
 * @returns 符合条件的文件路径数组
 */
export async function getFiles(options: GetFilesOptions) {
    const { dir = ".", match, count, depth, exclude } = options

    const result: string[] = []

    const e = Symbol() // 用于控制递归终止的特殊标记

    /**
     * 递归遍历目录的内部函数
     * @param path 当前处理的路径
     * @param depth 剩余遍历深度
     */
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
