import { existsSync } from "fs"
import { readFile, rename, writeFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import consola from "consola"

import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

export async function syncSnippets() {
    let setting = await readZixuluSetting()
    const { default: inquirer } = await import("inquirer")
    const userDir = homedir()
    const snippetSource = join(userDir, "AppData/Roaming/Code/User/snippets")
    const response = await fetch("https://luzixu.geskj.com/global.code-snippets")
    const code = await response.text()
    let filename = setting.syncVscodeSnippets?.filename || "global.code-snippets"
    if (existsSync(join(snippetSource, filename))) {
        const text = await readFile(join(snippetSource, filename), "utf-8")
        if (text === code) {
            consola.success("global.code-snippets 已是最新")
            return
        }
    }
    while (true) {
        if (!existsSync(join(snippetSource, filename))) break
        type Answer = { replace: boolean }
        const { replace } = await inquirer.prompt<Answer>({
            type: "confirm",
            name: "replace",
            message: "global.code-snippets 已存在，是否替换",
            default: setting.syncVscodeSnippets?.replace ?? false,
        })
        setting = { ...setting, syncVscodeSnippets: { ...setting.syncVscodeSnippets, replace } }
        if (replace) break
        type Answer2 = { filename: string }
        const { filename: newFilename } = await inquirer.prompt<Answer2>({
            type: "input",
            name: "filename",
            message: "请输入新的文件名（不带.code-snippets）",
            default: setting.syncVscodeSnippets?.filename?.replace(/\.code-snippets$/, ""),
        })
        setting = { ...setting, syncVscodeSnippets: { ...setting.syncVscodeSnippets, filename: newFilename } }
        filename = `${newFilename.replace(/\.code-snippets$/, "")}.code-snippets`
    }
    if (existsSync(join(snippetSource, filename))) {
        type Answer3 = { backup: boolean }
        const { backup } = await inquirer.prompt<Answer3>({
            type: "confirm",
            name: "backup",
            message: "是否备份原文件",
            default: setting.syncVscodeSnippets?.backup ?? true,
        })
        setting = { ...setting, syncVscodeSnippets: { ...setting.syncVscodeSnippets, backup } }
        if (backup) await rename(join(snippetSource, filename), join(snippetSource, `${filename}.${Date.now()}.bak`))
    }
    await writeFile(join(snippetSource, filename), code, "utf-8")
    await writeZixuluSetting(setting)
    consola.success("global.code-snippets 同步完成")
}
