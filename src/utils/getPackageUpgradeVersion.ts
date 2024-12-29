import consola from "consola"

import { getPackageVersions } from "./getPackageVersions"
import { UpgradeLevel } from "./getUpgradeDependencyConfig"
import { getVersionNum } from "./getVersionNum"
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
export async function getPackageUpgradeVersion({ packageName, version, level }: GetPackageUpgradeVersionConfig) {
    const current = getVersionNum(version)
    const versions = await retry({
        action: () => getPackageVersions(packageName),
        count: 4,
        callback: (error, current) => consola.error(`获取 ${packageName} 版本失败，第 ${current} 次重试`),
    })
    const reg = /^\d+\.\d+\.\d+$/
    const result = versions
        .filter(item => {
            if (!reg.test(item)) return false
            const latest = getVersionNum(item)
            let index = -1
            for (let i = 0; i < latest.length; i++) {
                const cv = current[i]
                const lv = latest[i]
                if (lv < cv) break
                if (lv > cv) {
                    index = i
                    break
                }
            }
            if (index === -1) return false
            if (level === "major") return index >= 0
            if (level === "minor") return index >= 1
            if (level === "patch") return index >= 2
        })
        .map(item => getVersionNum(item))
    result.sort((a, b) => {
        for (let i = 0; i < a.length; i++) {
            if (a[i] < b[i]) return 1
            if (a[i] > b[i]) return -1
        }
        return 0
    })
    return result[0]?.join(".")
}
