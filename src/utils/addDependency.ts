import consola from "consola"
import { getPackageLatestVersion } from "./getPackageLatestVersion"
import { readPackageJson } from "./readPackageJson"
import { retry } from "./retry"
import { writePackageJson } from "./writePackageJson"

export type DependencyType = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies"

export type AddDependenciesConfig = {
    package: string | string[]
    type?: DependencyType
    dir?: string
}

/**
 * 写入依赖
 */
export async function addDependency(config: AddDependenciesConfig): Promise<void> {
    try {
        const packages = Array.isArray(config.package) ? config.package : [config.package]
        const { type = "dependencies", dir } = config
        const packageJson = await readPackageJson(dir)
        packageJson[type] ??= {}
        for (const name of packages) {
            if (packageJson.dependencies?.[name] || packageJson.devDependencies?.[name] || packageJson.peerDependencies?.[name] || packageJson.optionalDependencies?.[name]) {
                consola.warn(`${name} 已存在于依赖中`)
                continue
            }
            const version = await retry({
                action: () => getPackageLatestVersion(name),
                count: 4,
                callback: (error, current) => consola.error(`获取 ${name} 版本失败，第 ${current} 次重试`)
            })
            packageJson[type][name] ??= `^${version}`
            consola.success(`添加 ${name} 至依赖成功`)
        }
        const keys = Object.keys(packageJson[type])
        keys.sort()
        const sortedDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDependencies[key] = packageJson[type][key]
        }
        packageJson[type] = sortedDependencies
        await writePackageJson({ data: packageJson, dir })
    } catch (error) {
        consola.error(error)
        throw error
    }
}
