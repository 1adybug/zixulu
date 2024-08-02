import { agent } from "@src/constant"
import consola from "consola"
import { exit } from "process"
import { getRegistry } from "./getRegistry"

/**
 * 获取包的最新版本号
 * @param packageName 包名
 * @returns 版本号
 */
export async function getPackageVersions(packageName: string) {
    try {
        const registry = await getRegistry()
        const url = new URL(`/${packageName}`, registry)
        const { default: fetch } = await import("node-fetch")
        const response = await fetch(url, {
            agent: global.__ZIXULU_PROXY__ ? agent : undefined
        })
        const data = (await response.json()) as any
        return Object.keys(data.versions) as string[]
    } catch (error) {
        throw error
    }
}
