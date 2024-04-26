import consola from "consola"
import { readFile, writeFile } from "fs/promises"
import { getFiles, getTypeInGenerics, installDependcies, spawnAsync } from "."
import { addPrettier } from "./addPrettier"
import { checkType } from "./checkType"

export type ArrowToFunctionChoice = {
    value: string
    short: string
    name: string
    checked: boolean
}

export async function arrowToFunction() {
    consola.start("开始将转换箭头函数组件为函数组件")
    const { default: inquirer } = await import("inquirer")
    const files = await getFiles({
        path: "./src",
        match: (path, stats) => path.ext === ".tsx" && stats.isFile()
    })
    const reg = /^(export )?const \w+?: FC.+?$/gm
    const { auto } = await inquirer.prompt({
        type: "confirm",
        name: "auto",
        message: "是否自动选择要转换的组件"
    })

    const warnFiles: Set<string> = new Set()
    const modifiedFiles: Set<string> = new Set()

    if (auto) {
        for (const file of files) {
            let code = await readFile(file, "utf-8")
            let exportDefaultReg: RegExp | undefined = undefined
            code = code.replace(reg, match => {
                if (match.includes("memo(") || match.includes("forwardRef(")) {
                    warnFiles.add(file)
                    return match
                }
                modifiedFiles.add(file)
                const hasExport = match.startsWith("export ")
                const name = match.match(/const (\w+?):/)![1]
                const edReg = new RegExp(`^export default ${name}$`, "m")
                let hasExportDefault = false
                if (!exportDefaultReg && !hasExport && edReg.test(code)) {
                    exportDefaultReg = edReg
                    hasExportDefault = true
                }
                const typeIndex = match.indexOf("FC<")
                if (typeIndex > 0) {
                    const type = getTypeInGenerics(match, typeIndex + 2)
                    return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}(props: ${type}) {`
                }
                return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}() {`
            })
            if (exportDefaultReg) code = code.replace(exportDefaultReg, "")
            await writeFile(file, code, "utf-8")
        }
    } else {
        for (const file of files) {
            let code = await readFile(file, "utf-8")
            const matches = code.match(reg)
            if (!matches) continue
            consola.start(file)
            const choices = Array.from(matches).reduce((prev: ArrowToFunctionChoice[], match, index) => {
                if (match.includes("memo(") || match.includes("forwardRef(")) {
                    warnFiles.add(file)
                    return prev
                }
                modifiedFiles.add(file)
                const hasExport = match.startsWith("export ")
                const funName = match.match(/const (\w+?):/)![1]
                const typeIndex = match.indexOf("FC<")
                if (typeIndex > 0) {
                    const type = getTypeInGenerics(match, typeIndex + 2)
                    const name = `◆ ${match}
    ◆ ${hasExport ? "export " : ""}function ${funName}(props: ${type}) {`
                    prev.push({ value: index.toString(), short: funName, name, checked: true })
                } else {
                    const name = `◆ ${match}
    ◆ ${hasExport ? "export " : ""}function ${funName}() {`
                    prev.push({ value: index.toString(), short: funName, name, checked: true })
                }

                return prev
            }, [])

            const length = choices.length.toString().length

            choices.forEach((choice, index) => {
                let first = true
                choice.name = choice.name.replace(/◆/g, () => {
                    if (first) {
                        first = false
                        return `◆ ${(index + 1).toString().padStart(length, "0")}.`
                    }
                    return "".padStart(length + 3, " ")
                })
            })

            const { indexs } = await inquirer.prompt({
                type: "checkbox",
                name: "indexs",
                message: `total ${choices.length} component${choices.length > 1 ? "s" : ""}`,
                choices
            })

            let index = 0

            let exportDefaultReg: RegExp | undefined = undefined

            code = code.replace(reg, match => {
                if (!indexs.includes(index.toString())) return match
                const hasExport = match.startsWith("export ")
                const name = match.match(/const (\w+?):/)![1]
                const edReg = new RegExp(`^export default ${name}$`, "m")
                let hasExportDefault = false
                if (!exportDefaultReg && !hasExport && edReg.test(code)) {
                    exportDefaultReg = edReg
                    hasExportDefault = true
                }
                const typeIndex = match.indexOf("FC<")
                if (typeIndex > 0) {
                    const type = getTypeInGenerics(match, typeIndex + 2)
                    return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}(props: ${type}) {`
                }
                return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}() {`
            })

            if (exportDefaultReg) code = code.replace(exportDefaultReg, "")

            console.log()

            await writeFile(file, code, "utf-8")
        }
    }

    if (modifiedFiles.size > 0) consola.success(`以下文件中的箭头函数组件已经转换为函数组件：\n\n${Array.from(modifiedFiles).join("\n")}`)

    if (warnFiles.size > 0) consola.warn(`以下文件中存在 memo 或 forwardRef，请手动转换：\n\n${Array.from(warnFiles).join("\n")}`)

    consola.start("格式化代码")

    await addPrettier()

    await installDependcies(true)

    await spawnAsync("npx prettier --write ./src")

    consola.start("检查项目是否存在 TypeScript 错误")

    await checkType()

    consola.success("转换完成")
}
