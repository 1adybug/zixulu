import fetch from "node-fetch"

import { agent } from "@/constant"

import { getRegistry } from "./getRegistry"

/**
 * 获取 npm 包的最新版本号
 * @param packageName 包名
 * @returns 最新版本号
 * @description
 * 通过 registry API 获取指定包的最新版本信息
 * 支持通过代理访问
 */
export async function getPackageLatestVersion(packageName: string) {
    const registry = await getRegistry()
    const url = new URL(`/${packageName}/latest`, registry)
    const response = await fetch(url, {
        agent: global.__ZIXULU_PROXY__ ? agent : undefined,
    })

    const data = (await response.json()) as any
    return data.version as string
}
