import { mkdir } from "fs/promises"
import consola from "consola"
import { execAsync } from "soda-nodejs"

import { agent } from "@constant/index"

import { download } from "./download"
import { readZixuluSetting } from "./readZixuluSetting"
import { retry } from "./retry"
import { writeZixuluSetting } from "./writeZixuluSetting"

/**
 * VSCode扩展信息接口
 */
export interface VscodeExt {
    id: string // 扩展ID
    name: string // 扩展显示名称
    version: string // 扩展版本
    url: string // 下载URL
}

/**
 * 获取指定VSCode扩展的详细信息
 * @param ext 扩展ID
 * @returns Promise<VscodeExt> 扩展详细信息
 */
export async function getVscodeExtInfo(ext: string): Promise<VscodeExt> {
    const { default: fetch } = await import("node-fetch")
    const response = await fetch(`https://marketplace.visualstudio.com/items?itemName=${ext}`, { agent })
    const html = await response.text()
    const reg = /^(.+?)\.(.+?)$/
    const [, author, name] = ext.match(reg)!
    let version: string
    if (ext === "ms-ceintl.vscode-language-pack-zh-hans") {
        const reg2 = /"Versions"\:(\[\{".+?\])/
        const versions = JSON.parse(html.match(reg2)![1]) as { version: string }[]
        const output = await execAsync("code --version")
        const codeVersions = output.split("\n")[0].split(".").map(Number)
        const item =
            versions.find(({ version }) =>
                version
                    .split(".")
                    .map(Number)
                    .every((item, index) => index >= 2 || item <= codeVersions[index]),
            ) ?? versions[0]
        version = item.version
    } else {
        const reg2 = /"Version":"(.+?)"/
        version = html.match(reg2)![1]
    }
    const reg4 = /<span class="ux-item-name">(.+?)<\/span>/
    const displayName = html.match(reg4)![1]
    const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${author}/vsextensions/${name}/${version}/vspackage`
    return { id: ext, name: displayName, version, url }
}

/**
 * 下载选定的VSCode扩展
 * @param dir 下载目标目录
 */
export async function downloadVscodeExts(dir: string) {
    await mkdir(dir, { recursive: true })
    const { default: inquirer } = await import("inquirer")
    consola.start("正在获取 VS Code 扩展列表")
    const extList = await execAsync("code --list-extensions")
    const exts = await Promise.all(
        extList
            .split(/[\n\r]/)
            .filter(Boolean)
            .filter(item => !item.startsWith("anysphere."))
            .map(ext => getVscodeExtInfo(ext)),
    )
    const setting = await readZixuluSetting()
    const vscodeDownloadHistory = setting?.vscodeDownloadHistory as string[] | undefined
    const exts2 = await inquirer.prompt({
        type: "checkbox",
        name: "exts",
        message: "选择需要下载的扩展",
        choices: exts.map(ext => ({ name: ext.name, value: ext.id })),
        default: vscodeDownloadHistory?.filter(ext => exts.some(item => item.id === ext)) || exts.map(ext => ext.id),
    })
    setting.vscodeDownloadHistory = exts2.exts
    await writeZixuluSetting(setting)
    await Promise.all(exts.filter(ext => exts2.exts.includes(ext.id)).map(ext => retry(() => download(ext.url, dir, `${ext.id}-${ext.version}.vsix`), 4)))
}
