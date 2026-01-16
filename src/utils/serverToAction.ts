import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

export async function serverToAction() {
    const dir = await readdir("shared")
    await rm("actions", { recursive: true, force: true })
    const actions = dir.filter(item => item.toLowerCase().endsWith(".ts"))

    const actions2: string[] = []

    for (const item of actions) {
        const content = await readFile(join("shared", item), "utf-8")
        if (/^"no export"$/m.test(content)) continue
        actions2.push(item)
    }

    await mkdir("actions", { recursive: true })
    await Promise.all(
        actions2.map(async item => {
            const base = item.replace(/\.ts$/i, "")
            await writeFile(
                join("actions", item),
                `"use server"

import { ${base} } from "@/shared/${base}"

import { createResponseFn } from "@/utils/createResponseFn"

export async function ${base}Action(...args: Parameters<typeof ${base}>) {
    return await createResponseFn(${base}, ...args)
}
`,
            )
        }),
    )
}
