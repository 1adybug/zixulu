import { join } from "node:path"
import { cwd } from "node:process"

/**
 * 获取 tsconfig.json 的完整路径
 * @param path 可选的基础路径，默认使用当前工作目录
 * @returns tsconfig.json 的完整路径
 */
export function getTsConfigJsonPath(path?: string) {
    return join(path ?? cwd(), "tsconfig.json")
}
