import { rename } from "fs/promises"
import { join } from "path"
import consola from "consola"
import YAML from "yaml"

import { agent } from "@constant/index"

import { download } from "./download"
import { sleep } from "./sleep"

/**
 * Winget 包管理器相关类型定义
 */
export namespace Winget {
    export interface Package {
        PackageIdentifier: string
        PackageVersion: string
        InstallerType: string
        InstallModes: string[]
        InstallerSwitches: InstallerSwitches
        ExpectedReturnCodes: ExpectedReturnCode[]
        UpgradeBehavior: string
        Protocols: string[]
        FileExtensions: string[]
        AppsAndFeaturesEntries: AppsAndFeaturesEntry[]
        Installers: Installer[]
        ManifestType: string
        ManifestVersion: string
    }

    export interface Installer {
        Architecture: string
        Scope?: string
        InstallerUrl: string
        InstallerSha256: string
        InstallerLocale?: string
        InstallerType?: string
    }

    export interface InstallerSwitches2 {
        Custom: string
    }

    export interface AppsAndFeaturesEntry {
        UpgradeCode: string
        InstallerType: string
    }

    export interface ExpectedReturnCode {
        InstallerReturnCode: number
        ReturnResponse: string
    }

    export interface InstallerSwitches {
        Log: string
    }
}

export interface GithubContent {
    name: string
    path: string
    sha: string
    size: number
    url: string
    html_url: string
    git_url: string
    download_url?: string | null
    type: string
    _links: Links
}

export interface Links {
    self: string
    git: string
    html: string
}

/**
 * 从 Winget 仓库下载软件
 * 1. 获取软件最新版本信息
 * 2. 解析安装包配置
 * 3. 下载并重命名安装包
 * @param param0 下载配置
 * @param param0.name 软件名称
 * @param param0.id Winget ID
 * @param param0.dir 下载目录
 * @param param0.filter 安装包筛选函数
 */
export async function downloadFromWinget({ name, id, dir, filter }: WingetDownloadInfo) {
    const { default: fetch } = await import("node-fetch")
    const firstLetter = id[0].toLowerCase()
    const path = id.replace(/\./g, "/")
    const response = await fetch(`https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/${firstLetter}/${path}`, { agent })
    const data: GithubContent[] = (await response.json()) as any
    if (!Array.isArray(data)) throw new Error((data as any).message)
    const reg2 = /^\d+(\.\d+?)*$/
    const stables = data.filter(item => reg2.test(item.name))
    stables.sort((a, b) => {
        const avs = a.name.split(".")
        const bvs = b.name.split(".")
        const max = Math.max(avs.length, bvs.length)
        for (let i = 0; i < max; i++) {
            const av = avs[i] ? parseInt(avs[i]) : 0
            const bv = bvs[i] ? parseInt(bvs[i]) : 0
            if (av < bv) return 1
            if (av > bv) return -1
        }
        return 0
    })
    const response2 = await fetch(
        `https://raw.githubusercontent.com/microsoft/winget-pkgs/master/manifests/${firstLetter}/${path}/${stables[0].name}/${id}.installer.yaml`,
        { agent },
    )
    const yaml = await response2.text()
    const pkg: Winget.Package = YAML.parse(yaml)

    const installers = filter ? pkg.Installers.filter(filter) : pkg.Installers

    if (installers.length === 0) {
        consola.warn(`未找到 ${name} 的安装程序`)
        return
    }

    const result: WingetItem[] = []

    for (const { InstallerUrl, Architecture } of installers) {
        const filename = await download(InstallerUrl, dir)
        result.push({ filename, version: pkg.PackageVersion, ext: new URL(InstallerUrl).pathname.endsWith(".exe") ? "exe" : "msi", architecture: Architecture })
    }

    for (const { version, filename, architecture, ext } of result) {
        await sleep(100)
        await rename(join(dir, filename), join(dir, `${name}-${version}-${architecture}.${ext}`))
    }
}

export type WingetItem = {
    filename: string
    version: string
    ext: string
    architecture: string
}

export type WingetDownloadInfo = {
    name: string
    id: string
    dir: string
    filter: (item: Winget.Installer, index: number, arr: Winget.Installer[]) => boolean
}
