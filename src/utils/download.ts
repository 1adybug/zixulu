import { createWriteStream } from "fs"
import { join } from "path"
import { Readable } from "stream"

import { agent } from "@constant/index"

import { getFilename } from "./getFilename"

export async function download(url: string, dir: string, filename?: string) {
    const { default: fetch } = await import("node-fetch")
    const response = await fetch(url, { agent })
    filename = getFilename(response.headers) || filename || new URL(url).pathname.split("/").at(-1)!
    const writeable = createWriteStream(join(dir, filename))
    await new Promise((resolve, reject) => Readable.from(response.body!).pipe(writeable).on("finish", resolve).on("error", reject))
    return filename
}
