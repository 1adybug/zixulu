import { readFile } from "fs/promises"
import { parse } from "path"

export async function code2Snippet(path: string) {
    const { default: clipboard } = await import("clipboardy")
    const { default: inquirer } = await import("inquirer")
    const { base } = parse(path)
    const code = await readFile(path, "utf-8")
    const placeholders: string[] = []
    while (true) {
        let { placeholder } = await inquirer.prompt({
            type: "input",
            name: "placeholder",
            message: "请输入需要替换的占位符，输入空字符串结束"
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
        placeholders.forEach((placeholder, index) => {
            const reg = new RegExp(placeholder, "g")
            line = line.replace(reg, `\${${index + 1}:${placeholder}}`)
        })
        line = line.slice(trim).trimEnd().replace(/\\/g, `\\\\`).replace(/"/g, `\\"`)
        return `            "${line}"`
    }
    const body = lines.map(line2Snippet).join(",\n")
    const snippet = `,
    "${base}": {
        "scope": "javascript,javascriptreact,typescript,typescriptreact",
        "prefix": "${base.toLowerCase().replace(/\W/, "")}",
        "body": [
${body}
        ]
    }`
    await clipboard.write(snippet)
}
