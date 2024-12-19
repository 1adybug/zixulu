import { agent } from "@src/constant"

import { getRegistry } from "./getRegistry"

/**
 * 获取包的最新版本
 * @param packageName 包名
 * @returns 版本号
 */
export async function getPackageLatestVersion(packageName: string) {
    try {
        const registry = await getRegistry()
        const url = new URL(`/${packageName}/latest`, registry)
        const { default: fetch } = await import("node-fetch")
        const response = await fetch(url, {
            agent: global.__ZIXULU_PROXY__ ? agent : undefined,
        })
        const data = (await response.json()) as any
        return data.version as string
    } catch (error) {
        throw error
    }
}
