import { writeFile } from "fs/promises"

import { OpenWithOptions } from "./addOpenWith"

export async function removeOpenWith(name: string, { file, folder, background }: OpenWithOptions) {
    if (!file && !folder && !background) throw new Error("至少选择一个")

    let reg = `\ufeffWindows Registry Editor Version 5.00
`

    // 在注册表路径前加 "-" 表示删除该项及其所有子项（包括 command）
    if (file) {
        reg += `
[-HKEY_CLASSES_ROOT\\*\\shell\\${name}]`
    }

    if (folder) {
        reg += `
[-HKEY_CLASSES_ROOT\\Directory\\shell\\${name}]`
    }

    if (background) {
        reg += `
[-HKEY_CLASSES_ROOT\\Directory\\Background\\shell\\${name}]`
    }

    // 生成一个以 remove_ 开头的文件，防止覆盖原有的生成文件
    await writeFile(`remove_open_with_${name}.reg`, reg, "utf-16le")
}
