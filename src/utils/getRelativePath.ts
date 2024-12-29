/**
 * 将路径转换为相对路径格式
 * @param path 需要转换的路径
 * @returns 转换后的相对路径，以 './' 开头
 */
export function getRelativePath(path: string) {
    path = path.replace(/\\/g, "/")
    if (path.startsWith("./")) return path
    if (path.startsWith("../")) return path
    return `./${path}`
}
