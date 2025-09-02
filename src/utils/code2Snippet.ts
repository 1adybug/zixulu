/**
 * 将代码文件转换为 VS Code 代码片段格式
 * 支持自定义占位符替换
 * @param path 源代码文件路径
 */
import { readFile } from "fs/promises"
import { parse } from "path"
import clipboard from "clipboardy"
import inquirer from "inquirer"

export async function code2Snippet(path: string) {
    const { name } = parse(path)
    const code = await readFile(path, "utf-8")
    const placeholders: string[] = []
    while (true) {
        let { placeholder } = await inquirer.prompt({
            type: "input",
            name: "placeholder",
            message: "请输入需要替换的占位符，输入空字符串结束",
        })
        placeholder = placeholder.trim()
        if (!placeholder) break
        placeholders.push(placeholder)
    }
    const lines = code.split("\n")
    const reg = /^ *$/
    const reg2 = /^ */
    const trim = Math.min(...lines.map(line => (reg.test(line) ? Infinity : reg2.exec(line)![0].length)))
    function line2Snippet(line: string) {
        line = line.slice(trim).trimEnd().replace(/\\/g, `\\\\`).replace(/"/g, `\\"`).replace(/\$/g, `\\\\$`)
        placeholders.forEach((placeholder, index) => {
            const reg = new RegExp(placeholder, "g")
            line = line.replace(reg, `\${${index + 1}:${placeholder}}`)
        })
        return `            "${line}"`
    }
    const body = lines.map(line2Snippet).join(",\n")
    const snippet = `,
    "${name}": {
        "scope": "javascript,javascriptreact,typescript,typescriptreact",
        "prefix": "${name.toLowerCase().replace(/\W/, "")}",
        "body": [
${body}
        ]
    }`
    await clipboard.write(snippet)
}
