import consola from "consola"
import { readdir, readFile, writeFile } from "fs/promises"
import { addedRules } from "."

export async function addGitignore() {
    consola.start("开始添加 .gitignore")
    const dir = await readdir("./")
    if (!dir.includes(".gitignore")) return await writeFile(".gitignore", addedRules.join("\n"), "utf-8")
    const gitignore = await readFile(".gitignore", "utf-8")
    const rules = gitignore.split("\n").map(v => v.trim())
    for (const rule of addedRules) {
        if (rules.includes(rule)) continue
        rules.push(rule)
    }
    await writeFile(".gitignore", rules.join("\n"), "utf-8")
    consola.success("添加 .gitignore 成功")
}
