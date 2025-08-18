import semver from "semver"

import { agent } from "@src/constant"

import { getRegistry } from "./getRegistry"
import { isStableVersion } from "./isStableVersion"

/**
 * 获取 npm 包所有可用版本号列表
 * @param packageName npm 包名
 * @returns 版本号数组
 * @description
 * 通过 registry API 获取指定包的所有历史版本信息
 * 支持通过代理访问
 */
export async function getPackageRequiredVersion(packageName: string, versionRange?: string) {
    const registry = await getRegistry()
    const url = new URL(`/${packageName}`, registry)
    const { default: fetch } = await import("node-fetch")
    const response = await fetch(url, {
        agent: global.__ZIXULU_PROXY__ ? agent : undefined,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any
    const result = Object.keys(data.versions)
        .filter(version => isStableVersion(version) && (!versionRange || semver.satisfies(version, versionRange)))
        .at(-1) as string | undefined
    if (!result) throw new Error(`${packageName} 没有符合条件的版本`)
    return result
}
