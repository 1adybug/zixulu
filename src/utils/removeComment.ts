import { readFile, writeFile } from "fs/promises"
import consola from "consola"

export async function removeComment(path: string) {
    consola.start("开始删除注释")
    const text = await readFile(path, "utf-8")
    const newText = text.replace(/^ *?\/\/.*?$/gm, "")
    await writeFile(path, newText, "utf-8")
    consola.success("删除注释成功")
}
