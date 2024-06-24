import consola from "consola"
import { mkdir, readdir, stat, writeFile } from "fs/promises"

export type CreateIndexHtmlConfig = {
    title: string
    description: string
    entryId: string
}

export async function createIndexHtml(config: CreateIndexHtmlConfig) {
    const { title, description, entryId } = config
    const indexHtml = `<!doctype html>
<html lang="zh">
    <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="/logo.webp" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="${description}" />
        <title>${title}</title>
    </head>
    <body>
        <div id="${entryId}"></div>
    </body>
</html>
`
    const dir = await readdir("./")
    let hasPublic = false
    if (dir.includes("public")) {
        const stats = await stat("public")
        if (stats.isDirectory()) hasPublic = true
    }
    if (!hasPublic) await mkdir("public", { recursive: true })
    await writeFile("public/index.html", indexHtml, "utf-8")
    consola.success("创建 index.html 成功")
}
