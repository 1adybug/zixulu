import consola from "consola"

import { getPackageVersions } from "./getPackageVersions"
import { UpgradeLevel } from "./getUpgradeDependencyConfig"
import { getVersionNum } from "./getVersionNum"
import { retry } from "./retry"

export type GetPackageUpgradeVersionConfig = {
    packageName: string
    version: string
    level: UpgradeLevel
}

/**
 * 获取包升级版本
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
