import { join } from "path"

/**
 * 获取 package.json 的完整路径
 * @param dir 项目目录，默认为当前目录
 * @returns package.json 的完整路径
 */
export function getPackageJsonPath(dir = ".") {
    return join(dir, "package.json")
}
