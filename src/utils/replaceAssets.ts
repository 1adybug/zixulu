import consola from "consola"
import { createWriteStream } from "fs"
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises"
import { HttpsProxyAgent } from "https-proxy-agent"
import md5 from "md5"
import { Response } from "node-fetch"
import { join, parse } from "path"
import { Readable } from "stream"
import { isAsset } from "./isAsset"
import { retry } from "./retry"

const reg = /(https?:|href=")\/\/[a-zA-Z0-9\.\-\*_\/\&\=\:\,\%\@]+/gm

const reg2 = /((from|import) *?["'])([a-zA-Z0-9\.\-\*_\/\&\=\:\,\%\@]+\.js)(["'])/gm

const reg3 = /(["'])([a-zA-Z0-9\.\-\*_\/\&\=\:\,\%\@]+\.js)(["'])/

export type ReplaceAssetsOptions = {
    base: string
    dir: string
    proxy?: boolean
}

export async function replaceAssets(options: ReplaceAssetsOptions) {
    const { base, dir, proxy } = options

    if (base) new URL(base)

    await mkdir("assets", { recursive: true })

    const agent = new HttpsProxyAgent("http://localhost:7890")

    const { default: fetch, Headers } = await import("node-fetch")

    const headers = new Headers()
    headers.set(
        "accept",
        `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7`
    )
    headers.set("accept-encoding", `gzip, deflate, br, zstd`)
    headers.set("accept-language", `en,zh-CN;q=0.9,zh;q=0.8`)
    headers.set("cache-control", `no-cache`)
    headers.set("dnt", `1`)
    headers.set("pragma", `no-cache`)
    headers.set("priority", `u=0, i`)
    headers.set("sec-ch-ua", `"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"`)
    headers.set("sec-ch-ua-mobile", `?0`)
    headers.set("sec-ch-ua-platform", `"Windows"`)
    headers.set("sec-fetch-dest", `document`)
    headers.set("sec-fetch-mode", `navigate`)
    headers.set("sec-fetch-site", `none`)
    headers.set("sec-fetch-user", `?1`)
    headers.set("upgrade-insecure-requests", `1`)
    headers.set("user-agent", `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36`)

    const downloadMap: Map<string, string> = new Map()

    const errors: Set<string> = new Set()

    async function download(url: string) {
        try {
            if (downloadMap.has(url)) return downloadMap.get(url)!
            if (url.startsWith(base) || new URL(url).hostname === "private-alipayobjects.alipay.com") {
                downloadMap.set(url, url)
                return url
            }
            // consola.start(`download ${url}`)
            const { ext } = parse(new URL(url).pathname)
            let response: Response
            let filename: string
            if (ext) {
                filename = `${md5(url)}${ext}`
            } else {
                response = await fetch(url, {
                    agent: proxy ? agent : undefined,
                    headers
                })
                filename = `${md5(url)}.${response.headers.get("content-type")?.split("/")[1].split("+")[0]}`
            }
            const dir = await readdir("assets")
            if (!dir.includes(filename)) {
                response ??= await fetch(url, {
                    agent: proxy ? agent : undefined,
                    headers
                })
                const file = createWriteStream(join("assets", filename))
                await new Promise((resolve, reject) => Readable.from(response.body!).pipe(file).on("finish", resolve).on("error", reject))
            }
            const url2 = base ? new URL(`/${filename}`, base).toString() : `/${filename}`
            // consola.success(`${url} -> ${url2}`)
            downloadMap.set(url, url2)
            if (filename.endsWith(".js")) {
                await replace(join("assets", filename), url)
            }
            return url2
        } catch (error) {
            // consola.error(error)
            errors.add(url)
            throw error
        }
    }

    async function getReplaceUrl(url: string, source?: string) {
        if (url.startsWith(`href="`)) {
            try {
                const newUrl = url.replace(/^href="/, "http:")
                const replaceUrl = await retry(() => download(newUrl), 4)
                return `href="${replaceUrl}`
            } catch (error) {}
            try {
                const newUrl = url.replace(/^href="/, "https:")
                const replaceUrl = await retry(() => download(newUrl), 4)
                return `href="${replaceUrl}`
            } catch (error) {}
            return url
        }
        if (url.includes("274496f1")) {
            console.log(url.startsWith("from"))
            console.log(url.startsWith("import"))
        }
        if (url.startsWith("from") || url.startsWith("import")) {
            console.log("import的原始", url)
            const a = await (async () => {
                const match = url.match(reg3)
                if (!match) {
                    console.log("没匹配到", url)
                    return url
                }
                let url2 = match[2].trim()
                console.log("import的链接", url2)
                if (!url2.startsWith("http")) {
                    if (url2.startsWith("/")) url2 = new URL(url2, source).toString()
                    else if (url2.startsWith("./")) url2 = parse(source!).dir + url2.slice(1)
                    else if (url2.startsWith("../")) url2 = parse(parse(source!).dir).dir + url2.slice(2)
                    else {
                        console.log("没匹配到", url)
                        return url
                    }
                }
                const replaceUrl = await retry(() => download(url2), 4)
                console.log("replaceUrl", replaceUrl)
                if (replaceUrl === url2) return url
                return url.replace(reg3, `$1${replaceUrl.startsWith("/") ? "." : ""}${replaceUrl}$3`)
            })()
            console.log(url, a)
            if (url.includes("p-274496f1.js")) {
                console.log(a)
                process.exit()
            }
            return a
        }
        try {
            const replaceUrl = await retry(() => download(url), 4)
            return replaceUrl
        } catch (error) {
            return url
        }
    }

    async function replace(input: string, source?: string) {
        // consola.start(`scanning ${input.replace(/\\/g, "/")}`)
        const status = await stat(input)
        if (status.isFile()) {
            const path = parse(input)
            if (path.ext === ".js" || path.ext === ".html" || path.ext === ".css" || path.ext === ".json") {
                const data = await readFile(input, "utf-8")
                const match = data.match(source ? reg2 : reg)
                if (!match) return
                const urlsToReplace: string[] = []
                let index = 0
                for (const url of match) {
                    if (source && url === `from"./p-274496f1.js"`) {
                        for (let i = 0; i < 20; i++) {
                            console.log("isAsset(url)", url, isAsset(url))
                            
                            console.log("reg2.test(url)", url, reg2.test(url))

                            console.log(isAsset(url) || reg2.test(url))

                            if (isAsset(url) || reg2.test(url)) {
                                console.log("真")
                            } else {
                                console.log("假")
                            }
                        }
                    }
                    if (isAsset(url) || reg2.test(url)) {
                        const url2 = await getReplaceUrl(url, source)
                        if (source) console.log("替换了", url, url2)
                        urlsToReplace.push(url2)
                    } else {
                        if (source) {
                            console.log("被跳过了", url)
                            console.log(url === `from"./p-274496f1.js"`)
                            process.exit()
                        }
                        urlsToReplace.push(url)
                    }
                }
                const newData = data.replace(source ? reg2 : reg, () => urlsToReplace[index++])
                if (source) {
                    console.log(input)
                    console.log(match)
                    console.log(urlsToReplace)
                }
                await writeFile(input, newData, "utf-8")
            }
            return
        }
        if (status.isDirectory()) {
            const dir2 = await readdir(input)
            for (const item of dir2) {
                await replace(join(input, item))
            }
        }
    }

    await replace(dir)

    errors.forEach(url => consola.error(url))
}
