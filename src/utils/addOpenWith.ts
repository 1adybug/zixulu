import { stat, writeFile } from "node:fs/promises"
import { parse, resolve } from "node:path"

export interface OpenWithOptions {
    file: boolean
    folder: boolean
    background: boolean
}

export async function addOpenWith(path: string, { file, folder, background }: OpenWithOptions) {
    if (!file && !folder && !background) throw new Error("至少选择一个")

    path = resolve(path)

    try {
        const status = await stat(path)
        if (!status.isFile()) throw new Error("路径不是文件")
    } catch (error) {}

    const { name } = parse(path)

    const escapedPath = path.replace(/[\\/]/g, "\\\\")

    let reg = `\ufeffWindows Registry Editor Version 5.00
`

    if (file) {
        reg += `
[HKEY_CLASSES_ROOT\\*\\shell\\${name}]
@="使用 ${name} 打开"
"Icon"="\\"${escapedPath}\\""

[HKEY_CLASSES_ROOT\\*\\shell\\${name}\\command]
@="\\"${escapedPath}\\" \\"%1\\""`
    }

    if (folder) {
        reg += `
[HKEY_CLASSES_ROOT\\Directory\\shell\\${name}]
@="使用 ${name} 打开"
"Icon"="\\"${escapedPath}\\""

[HKEY_CLASSES_ROOT\\Directory\\shell\\${name}\\command]
@="\\"${escapedPath}\\" \\"%V\\""`
    }

    if (background) {
        reg += `
[HKEY_CLASSES_ROOT\\Directory\\Background\\shell\\${name}]
@="使用 ${name} 打开"
"Icon"="\\"${escapedPath}\\""

[HKEY_CLASSES_ROOT\\Directory\\Background\\shell\\${name}\\command]
@="\\"${escapedPath}\\" \\"%V\\""
`
    }

    await writeFile(`add_open_with_${name}.reg`, reg, "utf-16le")
}
