export function getRelativePath(path: string) {
    path = path.replace(/\\/g, "/")
    if (path.startsWith("./")) return path
    if (path.startsWith("../")) return path
    return `./${path}`
}
