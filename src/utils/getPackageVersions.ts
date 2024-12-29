import { agent } from "@src/constant"
import { getRegistry } from "./getRegistry"

/**
 * 获取 npm 包所有可用版本号列表
 * @param packageName npm 包名
 * @returns 版本号数组
 * @description
 * 通过 registry API 获取指定包的所有历史版本信息
 * 支持通过代理访问
 */
export async function getPackageVersions(packageName: string) {
    try {
        const registry = await getRegistry()
        const url = new URL(`/${packageName}`, registry)
        const { default: fetch } = await import("node-fetch")
        const response = await fetch(url, {
            agent: global.__ZIXULU_PROXY__ ? agent : undefined,
        })
        const data = (await response.json()) as any
        return Object.keys(data.versions) as string[]
    } catch (error) {
        throw error
    }
}
