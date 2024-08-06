import consola from "consola"
import { createWriteStream } from "fs"
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises"
import { HttpsProxyAgent } from "https-proxy-agent"
import md5 from "md5"
import { Response } from "node-fetch"
import { join, parse } from "path"
import { Readable } from "stream"
import { isAsset } from "./isAsset"

const reg = /(https?:|href=")\/\/[a-zA-Z0-9\.\-\*_\/\&\=\:\,\%]+/g

export type ReplaceAssetsOptions = {
    base: string
    dir: string
    proxy?: boolean
}

export async function replaceAssets(options: ReplaceAssetsOptions) {
    const { base, dir, proxy } = options

    await mkdir("assets", { recursive: true })

    const agent = proxy ? new HttpsProxyAgent("http://localhost:7890") : undefined

    const { default: fetch } = await import("node-fetch")

    const downloadMap: Map<string, string> = new Map()

    async function download(url: string) {
        consola.start(url)
        if (downloadMap.has(url)) return downloadMap.get(url)!
        if (url.startsWith(base) || new URL(url).hostname === "private-alipayobjects.alipay.com") {
            downloadMap.set(url, url)
            return url
        }
        const { ext } = parse(new URL(url).pathname)
        let response: Response
        let filename: string
        if (ext) {
            filename = `${md5(url)}${ext}`
        } else {
            response = await fetch(url, { agent: url.includes("github") ? agent : undefined })
            filename = `${md5(url)}.${response.headers.get("content-type")?.split("/")[1].split("+")[0]}`
        }
        const dir = await readdir("assets")
        if (!dir.includes(filename)) {
            response ??= await fetch(url, { agent: url.includes("github") ? agent : undefined })
            const file = createWriteStream(join("assets", filename))
            await new Promise((resolve, reject) => Readable.from(response.body!).pipe(file).on("finish", resolve).on("error", reject))
        }
        const url2 = new URL(`/${filename}`, base).toString()
        downloadMap.set(url, url2)
        return url2
    }

    async function getReplaceUrl(url: string) {
        if (url.startsWith(`href="`)) {
            try {
                const newUrl = url.replace(/^href="/, "http:")
                const replaceUrl = await download(newUrl)
                return `href="${replaceUrl}`
            } catch (error) {}
            try {
                const newUrl = url.replace(/^href="/, "https:")
                const replaceUrl = await download(newUrl)
                return `href="${replaceUrl}`
            } catch (error) {}
            return url
        }
        try {
            const replaceUrl = await download(url)
            return replaceUrl
        } catch (error) {
            return url
        }
    }

    async function replace(dir: string) {
        const dir2 = await readdir(dir)
        for (const item of dir2) {
            const status = await stat(join(dir, item))
            if (status.isDirectory()) {
                await replace(join(dir, item))
                continue
            }
            if (status.isFile()) {
                const path = parse(item)
                if (path.ext === ".js" || path.ext === ".html" || path.ext === ".css" || path.ext === ".json") {
                    const data = await readFile(join(dir, item), "utf-8")
                    const match = data.match(reg)
                    if (!match) continue
                    const urlsToReplace: string[] = []
                    for (const url of match) {
                        if (isAsset(url)) {
                            const url2 = await getReplaceUrl(url)
                            urlsToReplace.push(url2)
                        } else {
                            urlsToReplace.push(url)
                        }
                    }
                    const newData = data.replace(reg, () => urlsToReplace.shift()!)
                    await writeFile(join(dir, item), newData, "utf-8")
                }
            }
        }
    }

    await replace(dir)
}
