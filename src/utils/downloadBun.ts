import { rename, rm } from "fs/promises"
import { join } from "path"
import { unzip } from "soda-nodejs"

import { download } from "./download"
import { getLatestRelease } from "./getLatestRelease"

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
