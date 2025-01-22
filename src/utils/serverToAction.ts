import { mkdir, readdir, rm, writeFile } from "fs/promises"
import { join } from "path"

export async function serverToAction() {
    const dir = await readdir("server")
    await rm("actions", { recursive: true, force: true })
    const actions = dir.filter(item => item.toLowerCase().endsWith(".ts"))
    await mkdir("actions", { recursive: true })
    await Promise.all(
        actions.map(async item => {
            const base = item.replace(/\.ts$/i, "")
            await writeFile(
                join("actions", item),
                `"use server"

import { ${base} } from "@/server/${base}"

import { getDataResponse } from "@/utils/getDataResponse"

export async function ${base}Action(...args: Parameters<typeof ${base}>) {
    return await getDataResponse(${base}, ...args)
}
`,
            )
        }),
    )
}
