import fetch from "node-fetch"
import semver from "semver"

import { agent } from "@/constant"

import { getRegistry } from "./getRegistry"
import { isStableVersion } from "./isStableVersion"

export interface Registry {
    _id: string
    _rev: string
    "dist-tags": Record<string, string>
    name: string
    time: Time
    versions: Record<string, Version>
    description: string
    license: string
    maintainers: NpmUser[]
    readme: string
    _source_registry_name: string
    keywords: string[]
    bugs: Bugs
    homepage: string
    repository: Repository
}

export interface Repository {
    type: string
    url: string
}

export interface Bugs {
    url: string
}

export interface Version {
    name: string
    version: string
    main: string
    license: string
    type: string
    bin?: Record<string, string>
    scripts?: Record<string, string>
    devDependencies?: Record<string, string>
    dependencies?: Record<string, string>
    _id: string
    _nodeVersion: string
    _npmVersion: string
    dist: Dist
    _npmUser: NpmUser
    directories?: Record<string, string>
    maintainers: NpmUser[]
    _npmOperationalInternal: NpmOperationalInternal
    _hasShrinkwrap: boolean
    _cnpmcore_publish_time: string
    publish_time: number
    _source_registry_name: string
}

export interface NpmOperationalInternal {
    host: string
    tmp: string
}

export interface NpmUser {
    name: string
    email: string
}

export interface Dist {
    integrity: string
    shasum: string
    tarball: string
    fileCount: number
    unpackedSize: number
    signatures: Signature[]
    size: number
}

export interface Signature {
    keyid: string
    sig: string
}

export type Time = {
    created: string
    modified: string
    [key: string]: string
}

/**
 * 获取 npm 包所有可用版本号列表
 * @param packageName npm 包名
 * @returns 版本号数组
 * @description
 * 通过 registry API 获取指定包的所有历史版本信息
 * 支持通过代理访问
 */
export async function getPackageRequiredVersion(
    packageName: string,
    versionRange?: string,
) {
    const registry = await getRegistry()
    const url = new URL(`/${packageName}`, registry)
    const response = await fetch(url, {
        agent: global.__ZIXULU_PROXY__ ? agent : undefined,
    })
    const data = (await response.json()) as Registry

    if (versionRange?.startsWith("@")) {
        const version = versionRange.slice(1)

        // 先精确匹配版本
        let result = Object.keys(data.versions).find(item => item === version)

        if (result) return result
        // 再匹配 dist-tags 中的版本
        result = data["dist-tags"][version]
        if (result) return result
        // 再匹配版本号开头匹配的版本
        result = Object.keys(data.versions)
            .filter(item => item.startsWith(version) && isStableVersion(item))
            .at(-1)
        if (result) return result
        throw new Error(`${packageName} 没有符合条件的版本`)
    }

    const result = Object.keys(data.versions)
        .filter(
            version =>
                isStableVersion(version) &&
                (!versionRange || semver.satisfies(version, versionRange)),
        )
        .at(-1) as string | undefined
    if (!result) throw new Error(`${packageName} 没有符合条件的版本`)
    return result
}
