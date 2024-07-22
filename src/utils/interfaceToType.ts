import consola from "consola"
import { readFile, writeFile } from "fs/promises"
import { getFiles,  splitExtendsType } from "."
import { checkType } from "./checkType"

export async function interfaceToType() {
    consola.start("开始将项目中的 interface 转换为 type")

    const files = await getFiles({
        match: (path, stats) => (path.ext === ".tsx" || path.ext === ".ts") && !path.base.endsWith(".d.ts") && stats.isFile(),
        exclude: (path, stats) => stats.isDirectory() && path.base === "node_modules"
    })

    const { default: inquirer } = await import("inquirer")

    const { ifContinue } = await inquirer.prompt({
        type: "confirm",
        name: "ifContinue",
        message: "是否继续"
    })

    if (!ifContinue) return

    const reg = /(export )?interface (.+?) {/gm
    const reg1 = /\bexport\b/
    const reg2 = /(\w+?) extends (.+)/
    const modifiedFiles: Set<string> = new Set()

    for (const file of files) {
        const code = await readFile(file, "utf-8")
        const newCode = code.replace(reg, match => {
            modifiedFiles.add(file)
            const hasExport = reg1.test(match)
            const $2 = match.replace(reg, "$2")
            const matches = $2.match(reg2)
            if (matches) {
                const name = matches[1]
                const extendsTypes = splitExtendsType(matches[2]).join(" & ")

                return `${hasExport ? "export " : ""}type ${name} = ${extendsTypes} & {`
            }
            return `${hasExport ? "export " : ""}type ${$2} = {`
        })
        await writeFile(file, newCode, "utf-8")
    }

    if (modifiedFiles.size > 0) consola.success(`以下文件中的 interface 已经转换为 type：\n\n${Array.from(modifiedFiles).join("\n")}`)

    consola.start("检查项目是否存在 TypeScript 错误")

    await checkType()

    consola.success("interface 转换为 type 完成")
}
