import { readFile } from "fs/promises"

import clipboard from "clipboardy"
import consola from "consola"
import { isNonNullable, json2type as j2t } from "deepsea-tools"

export async function json2type(path?: string) {
    const json = isNonNullable(path) ? await readFile(path, "utf-8") : await clipboard.read()

    try {
        JSON.parse(json)
    } catch {
        consola.error(`请输入有效的 json 文件路径或复制有效的 json 文本`)
    }

    const type = j2t(json)
    await clipboard.write(type)
    consola.success("类型已复制到剪贴板")
}
