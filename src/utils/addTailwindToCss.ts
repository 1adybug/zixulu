import { readFile, writeFile } from "fs/promises"
import { parse } from "path"
import consola from "consola"

import { createEntryCss } from "./createEntryCss"
import { getFiles } from "./getFiles"

/** 
 * 向项目中添加 Tailwind CSS 配置
 * 会在 index.css/app.css/globals.css 中添加 Tailwind 引用
 * 如果没有找到这些文件，会创建一个新的 index.css
 */
export async function addTailwindToCss() {
    try {
        const files = await getFiles({
            match: (path, stats) =>
                (path.base.toLowerCase() === "index.css" || path.base.toLowerCase() === "app.css" || path.base.toLowerCase() === "globals.css") &&
                stats.isFile(),
            count: 1,
            exclude: (path, stats) => path.base === "node_modules" && stats.isDirectory(),
        })
        if (files.length === 0) files.push(await createEntryCss())
        const file = files[0]
        const { base } = parse(file)
        const css = await readFile(file, "utf-8")
        if (css.includes("@tailwind")) {
            consola.warn(`${base} 已经包含 tailwind`)
            return
        }
        await writeFile(
            file,
            `@tailwind base;
@tailwind components;
@tailwind utilities;

${css}`,
            "utf-8",
        )
        consola.success(`添加 tailwind 成功`)
    } catch (error) {
        console.log(error)
        consola.fail(`添加 tailwind 失败`)
    }
}
