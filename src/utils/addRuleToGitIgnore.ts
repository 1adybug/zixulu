import { readFile, readdir, writeFile } from "fs/promises"

import { CommitType } from "@src/constant"

import { getCommitMessage } from "./getCommitMessage"

/**
 * 向 .gitignore 文件添加规则
 * @param rules 要添加的规则列表
 * @returns commit message
 */
export async function addRuleToGitIgnore(...rules: string[]) {
    const dir = await readdir(".")
    const message = getCommitMessage(CommitType.feature, `添加 .gitignore 规则 ${rules.join(", ")}`)
    if (!dir.includes(".gitignore")) {
        await writeFile(".gitignore", rules.join("\n"), "utf-8")
        return message
    }
    const gitignore = await readFile(".gitignore", "utf-8")
    const rules2 = gitignore.split("\n").map(v => v.trim())
    for (const rule of rules) {
        if (rules2.includes(rule)) continue
        rules2.push(rule)
    }
    await writeFile(".gitignore", rules2.join("\n"), "utf-8")
    return message
}
