import consola from "consola"
import semver from "semver"

import { getPackageRequiredVersion } from "./getPackageRequiredVersion"
import { getPackageVersionFromRange } from "./getPackageVersionFromRange"
import { UpgradeLevel } from "./getUpgradeDependencyConfig"
import { retry } from "./retry"

/**
 * 包升级配置接口
 */
export type GetPackageUpgradeVersionConfig = {
    /** 包名 */
    packageName: string
    /** 当前版本 */
    version: string
    /** 升级级别：major/minor/patch */
    level: UpgradeLevel
}

/**
 * 获取包的推荐升级版本
 * @param config 升级配置
 * @returns 推荐的升级版本号，如果没有可用升级则返回 undefined
 * @description
 * 1. 获取所有可用版本
 * 2. 根据语义化版本规则过滤符合升级要求的版本
 * 3. 按版本号排序并返回最新的符合条件的版本
 */
export async function getPackageUpgradeVersion({
    packageName,
    version,
    level,
}: GetPackageUpgradeVersionConfig) {
    version = getPackageVersionFromRange(version)
    const minorVersion = semver.inc(version, "minor")
    const majorVersion = semver.inc(version, "major")

    const versionRange =
        level === "patch"
            ? `>=${version} <${minorVersion}`
            : level === "minor"
              ? `>=${version} <${majorVersion}`
              : `>=${version}`

    const result = await retry({
        action: () => getPackageRequiredVersion(packageName, versionRange),
        count: 4,
        callback: (error, current) =>
            consola.error(`获取 ${packageName} 版本失败，第 ${current} 次重试`),
    })
    return result
}
