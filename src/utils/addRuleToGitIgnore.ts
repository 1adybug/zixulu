import { CommitType } from "@src/constant"
import { readdir, readFile, writeFile } from "fs/promises"
import { getCommitMessage } from "./getCommitMessage"

export async function addRuleToGitIgnore(...rules: string[]) {
    const dir = await readdir(".")
    const message = getCommitMessage(CommitType.feature, `添加 .gitignore 规则 ${rules.join(", ")}`)
    if (!dir.includes(".gitignore")) {
        await writeFile(".gitignore", rules.join("\n"), "utf-8")
        return message
    }
    const gitignore = await readFile(".gitignore", "utf-8")
    const rules2 = gitignore.split("\n").map(v => v.trim())
    let added = false
    for (const rule of rules) {
        if (rules2.includes(rule)) continue
        added = true
        rules2.push(rule)
    }
    if (!added) throw new Error("规则已存在")
    await writeFile(".gitignore", rules2.join("\n"), "utf-8")
    return message
}
