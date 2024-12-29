import { readPackageJson } from "./readPackageJson"

/**
 * 获取指定包在 package.json 中的版本号
 * @param packageName 包名
 * @param dir 项目目录，默认为当前目录
 * @returns 版本号，如果未找到则返回 undefined
 * @description 依次检查 dependencies、devDependencies、peerDependencies 和 optionalDependencies
 */
export async function getPackageVersionInDependcy(packageName: string, dir = "."): Promise<string | undefined> {
    const packageJson = await readPackageJson(dir)
    let version =
        packageJson.dependencies?.[packageName] ??
        packageJson.devDependencies?.[packageName] ??
        packageJson.peerDependencies?.[packageName] ??
        packageJson.optionalDependencies?.[packageName]
    if (!version) return undefined
    return version.replace(/^\D+/, "")
}
