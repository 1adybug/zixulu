import { rm, rename } from "fs/promises"
import { join } from "path"
import { unzip } from "soda-nodejs"
import { download } from "./download"

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
