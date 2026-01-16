import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"

export async function pnpm() {
    let content = ``
    if (existsSync(".npmrc")) content = await readFile(".npmrc", "utf-8")

    const lines = content
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)

    lines.push(`node-linker=hoisted`)
    lines.push(`shamefully-hoist=true`)
    writeFile(".npmrc", lines.join("\n"))
}
