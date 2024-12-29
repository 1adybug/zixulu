import { readPackageJson } from "./readPackageJson"

/**
 * 从 package.json 中获取指定依赖的版本
 * @param name 依赖包名称
 * @returns 依赖版本号，如果未找到则返回 undefined
 */
export async function getDependcy(name: string): Promise<string | undefined> {
    const packageJson = await readPackageJson()
    return (
        packageJson.dependencies?.[name] ||
        packageJson.devDependencies?.[name] ||
        packageJson.peerDependencies?.[name] ||
        packageJson.optionalDependencies?.[name]
    )
}
