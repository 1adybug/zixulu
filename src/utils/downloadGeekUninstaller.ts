import { rename, rm } from "node:fs/promises"
import { join } from "node:path"

import { unzip } from "soda-nodejs"

import { download } from "./download"

/**
 * 下载 Geek Uninstaller 卸载工具
 * 1. 下载 zip 文件
 * 2. 解压并获取版本号
 * 3. 重命名为带版本号的文件名
 * @param dir 下载目录
 */
export async function downloadGeekUninstaller(dir: string) {
    await download(`https://geekuninstaller.com/geek.zip`, dir)
    await unzip({
        input: join(dir, "geek.zip"),
        output: dir,
    })
    await rm(join(dir, "geek.zip"), { force: true })
    const response = await fetch("https://geekuninstaller.com/download")
    const text = await response.text()
    const version = text.match(/<b>(.+?)<\/b>/)![1]
    await rename(join(dir, "geek.exe"), join(dir, `Geek-${version}-x64.exe`))
}
