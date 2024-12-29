import { rename, rm } from "fs/promises"
import { join } from "path"
import { unzip } from "soda-nodejs"

import { download } from "./download"
import { getLatestRelease } from "./getLatestRelease"

/**
 * 从 GitHub 下载 Bun 运行时并解压安装
 * @param dir 下载目标目录
 * @throws 如果找不到对应的下载文件
 */
export async function downloadBun(dir: string) {
    const release = await getLatestRelease("oven-sh", "bun")
    const url = release.assets.find(asset => asset.name === "bun-windows-x64.zip")?.browser_download_url
    if (!url) throw new Error("未找到 bun-windows-x64.zip")
    await download(url, dir)
    await unzip({
        input: "bun-windows-x64.zip",
        output: ".",
        cwd: dir,
    })
    await rename(join(dir, "bun-windows-x64", "bun.exe"), join(dir, "bun.exe"))
    await rm(join(dir, "bun-windows-x64.zip"), { force: true })
    await rm(join(dir, "bun-windows-x64"), { force: true, recursive: true })
}
