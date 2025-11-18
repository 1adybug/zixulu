import consola from "consola"

import { getPackageRequiredVersion } from "./getPackageRequiredVersion"
import { readPackageJson } from "./readPackageJson"
import { retry } from "./retry"
import { writePackageJson } from "./writePackageJson"

/** 依赖类型 */
export type DependencyType = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies"

export interface PackageVersion {
    packageName: string
    versionRange?: string
}

/** 添加依赖配置 */
export type AddDependenciesConfig = {
    /** 包名或包名列表 */
    package: string | PackageVersion | (string | PackageVersion)[]
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
        const packages = (Array.isArray(config.package) ? config.package : [config.package]).map(item =>
            typeof item === "string" ? { packageName: item } : item)
        const { type = "dependencies", dir } = config
        const packageJson = await readPackageJson(dir)
        packageJson[type] ??= {}

        const addedPackages: Record<string, string> = {}

        for (const { packageName, versionRange } of packages) {
            if (
                packageJson.dependencies?.[packageName] ||
                packageJson.devDependencies?.[packageName] ||
                packageJson.peerDependencies?.[packageName] ||
                packageJson.optionalDependencies?.[packageName]
            ) {
                consola.warn(`${packageName} 已存在于依赖中`)
                continue
            }

            const version = await retry({
                action: () => getPackageRequiredVersion(packageName, versionRange),
                count: 4,
                callback: (error, current) => consola.error(`获取 ${packageName} 版本失败，第 ${current} 次重试`),
            })
            addedPackages[packageName] = version
            packageJson[type][packageName] ??= `^${version}`
            consola.success(`添加 ${packageName} 至依赖成功`)
        }

        const keys = Object.keys(packageJson[type])
        keys.sort()

        const sortedDependencies: Record<string, string> = {}

        for (const key of keys) sortedDependencies[key] = packageJson[type][key]

        packageJson[type] = sortedDependencies
        await writePackageJson({ data: packageJson, dir })
        return addedPackages
    } catch (error) {
        consola.error(error)
        throw error
    }
}
