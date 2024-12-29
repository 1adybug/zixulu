import consola from "consola"

import { getPackageLatestVersion } from "./getPackageLatestVersion"
import { readPackageJson } from "./readPackageJson"
import { retry } from "./retry"
import { writePackageJson } from "./writePackageJson"

/** 依赖类型 */
export type DependencyType = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies"

/** 添加依赖配置 */
export type AddDependenciesConfig = {
    /** 包名或包名列表 */
    package: string | string[]
    /** 依赖类型 */
    type?: DependencyType
    /** 项目目录 */
    dir?: string
}

/**
 * 写入依赖到 package.json
 * @param config 配置项
 * @returns 添加的包及其版本号
 */
export async function addDependency(config: AddDependenciesConfig): Promise<Record<string, string>> {
    try {
        const packages = Array.isArray(config.package) ? config.package : [config.package]
        const { type = "dependencies", dir } = config
        const packageJson = await readPackageJson(dir)
        packageJson[type] ??= {}
        const addedPackages: Record<string, string> = {}
        for (const name of packages) {
            if (
                packageJson.dependencies?.[name] ||
                packageJson.devDependencies?.[name] ||
                packageJson.peerDependencies?.[name] ||
                packageJson.optionalDependencies?.[name]
            ) {
                consola.warn(`${name} 已存在于依赖中`)
                continue
            }
            const version = await retry({
                action: () => getPackageLatestVersion(name),
                count: 4,
                callback: (error, current) => consola.error(`获取 ${name} 版本失败，第 ${current} 次重试`),
            })
            addedPackages[name] = version
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
        return addedPackages
    } catch (error) {
        consola.error(error)
        throw error
    }
}
