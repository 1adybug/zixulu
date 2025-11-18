import { createWriteStream } from "fs"
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises"
import { join, parse } from "path"
import { Readable } from "stream"

import consola from "consola"
import md5 from "md5"
import fetch, { Headers, Response } from "node-fetch"

import { agent } from "@/constant"

import { isAsset } from "./isAsset"
import { retry } from "./retry"

function getReg() {
    return /(https?:|href=")\/\/[a-zA-Z0-9.\-*_/&=:,%@]+/gm
}

function getReg2() {
    return /((from|import) *?["'])([a-zA-Z0-9.\-*_/&=:,%@]+\.js)(["'])/gm
}

const reg3 = /(["'])([a-zA-Z0-9.\-*_/&=:,%@]+\.js)(["'])/

const reg4 = /[a-z0-9]{32}\.js/

export type ReplaceAssetsOptions = {
    base?: string
    input: string
    output?: string
    proxy?: boolean
}

export async function replaceAssets(options: ReplaceAssetsOptions) {
    const { base, input, output = "assets", proxy } = options

    await mkdir(output, { recursive: true })

    const headers = new Headers()
    headers.set(
        "accept",
        `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7`,
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
            consola.start(`download ${url}`)
            const { ext } = parse(new URL(url).pathname)
            let response: Response
            let filename: string

            if (ext) filename = `${md5(url)}${ext}`
            else {
                response = await fetch(url, {
                    agent: proxy ? agent : undefined,
                    headers,
                })
                filename = `${md5(url)}.${response.headers.get("content-type")?.split("/")[1].split("+")[0]}`
            }

            const dir = await readdir(output)

            if (!dir.includes(filename)) {
                response ??= await fetch(url, {
                    agent: proxy ? agent : undefined,
                    headers,
                })
                const file = createWriteStream(join(output, filename))
                await new Promise<0>((resolve, reject) =>
                    Readable.from(response.body!)
                        .pipe(file)
                        .on("finish", () => resolve(0))
                        .on("error", reject))
            }

            const url2 = `${base ? (base.endsWith("/") ? base.slice(0, -1) : base) : ""}/${filename}`

            // consola.success(`${url} -> ${url2}`)
            downloadMap.set(url, url2)

            errors.delete(url)

            if (filename.endsWith(".js")) await replace(join(output, filename), url)

            return url2
        } catch (error) {
            consola.error(error)
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
            } catch {
                /* empty */
            }

            try {
                const newUrl = url.replace(/^href="/, "https:")
                const replaceUrl = await retry(() => download(newUrl), 4)
                return `href="${replaceUrl}`
            } catch {
                /* empty */
            }

            return url
        }

        if (url.startsWith("from") || url.startsWith("import")) {
            const match = url.match(reg3)
            if (!match) return url
            let url2 = match[2].trim()

            if (!url2.startsWith("http")) {
                if (url2.startsWith("/")) url2 = new URL(url2, source).toString()
                else {
                    if (url2.startsWith("./")) url2 = parse(source!).dir + url2.slice(1)
                    else {
                        if (url2.startsWith("../")) url2 = parse(parse(source!).dir).dir + url2.slice(2)
                        else return url
                    }
                }
            }

            const replaceUrl = await retry(() => download(url2), 4)
            if (replaceUrl === url2) return url
            return url.replace(reg3, `$1${replaceUrl.startsWith("/") ? "." : ""}${replaceUrl}$3`)
        }

        try {
            const replaceUrl = await retry(() => download(url), 4)
            return replaceUrl
        } catch {
            return url
        }
    }

    async function replace(input: string, source?: string) {
        consola.start(`scanning ${input.replace(/\\/g, "/")}`)
        const status = await stat(input)

        if (status.isFile()) {
            const path = parse(input)

            if (path.ext === ".js" || path.ext === ".html" || path.ext === ".css" || path.ext === ".json") {
                const data = await readFile(input, "utf-8")
                const match = data.match(source ? getReg2() : getReg())
                if (!match) return

                const urlsToReplace: string[] = []

                let index = 0

                for (const url of match)
                    if (isAsset(url) || getReg2().test(url)) {
                        const url2 = await getReplaceUrl(url, source)
                        urlsToReplace.push(url2)
                    } else urlsToReplace.push(url)

                const newData = data.replace(source ? getReg2() : getReg(), () => urlsToReplace[index++])

                if (source)
                    urlsToReplace.forEach(url => {
                        if (!reg4.test(url)) console.log(url)
                    })

                await writeFile(input, newData, "utf-8")
            }

            return
        }

        if (status.isDirectory()) {
            const dir2 = await readdir(input)

            for (const item of dir2) await replace(join(input, item))
        }
    }

    await replace(input)

    consola.success(errors.size > 0 ? "替换完成，以下文件下载失败：" : "替换完成")

    errors.forEach(url => consola.error(url))
}
