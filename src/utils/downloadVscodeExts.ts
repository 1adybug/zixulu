import { mkdir } from "fs/promises"
import consola from "consola"
import { execAsync } from "soda-nodejs"

import { agent } from "@constant/index"

import { download } from "./download"
import { getZixuluSetting } from "./getZixuluSetting"
import { retry } from "./retry"
import { setZixuluSetting } from "./setZixuluSetting"

// 定义 VscodeExt 接口
export interface VscodeExt {
    id: string
    name: string
    version: string
    url: string
}

// 获取 VSCode 扩展信息的函数
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

// 下载 VSCode 扩展的函数
export async function downloadVscodeExts(dir: string) {
    await mkdir(dir, { recursive: true })
    const { default: inquirer } = await import("inquirer")
    consola.start("正在获取 VS Code 扩展列表")
    const extList = await execAsync("code --list-extensions")
    const exts = await Promise.all(
        extList
            .split(/[\n\r]/)
            .filter(Boolean)
            .map(ext => getVscodeExtInfo(ext)),
    )
    const setting = await getZixuluSetting()
    const vscodeDownloadHistory = setting?.vscodeDownloadHistory as string[] | undefined
    const exts2 = await inquirer.prompt({
        type: "checkbox",
        name: "exts",
        message: "选择需要下载的扩展",
        choices: exts.map(ext => ({ name: ext.name, value: ext.id })),
        default: vscodeDownloadHistory?.filter(ext => exts.some(item => item.id === ext)) || exts.map(ext => ext.id),
    })
    setting.vscodeDownloadHistory = exts2.exts
    await setZixuluSetting(setting)
    await Promise.all(exts.filter(ext => exts2.exts.includes(ext.id)).map(ext => retry(() => download(ext.url, dir, `${ext.id}-${ext.version}.vsix`), 4)))
}
