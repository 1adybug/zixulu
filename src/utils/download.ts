import { createWriteStream } from "fs"
import { join } from "path"
import { Readable } from "stream"

import { agent } from "@constant/index"

import { getFilename } from "./getFilename"

/**
 * 通用文件下载函数
 * @param url 下载地址
 * @param dir 下载目标目录
 * @param filename 可选的文件名
 * @returns 实际保存的文件名
 */
export async function download(url: string, dir: string, filename?: string) {
    const { default: fetch } = await import("node-fetch")
    const response = await fetch(url, { agent })
    filename = getFilename(response.headers) || filename || new URL(url).pathname.split("/").at(-1)!
    const writeable = createWriteStream(join(dir, filename))
    await new Promise<0>((resolve, reject) => Readable.from(response.body!).pipe(writeable).on("finish", () => resolve(0)).on("error", reject))
    return filename
}
