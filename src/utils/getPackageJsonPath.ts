import { join } from "path"

/**
 * 获取 package.json 路径
 * @param dir 目录
 * @returns package.json 路径
 */
export function getPackageJsonPath(dir = ".") {
    return join(dir, "package.json")
}
