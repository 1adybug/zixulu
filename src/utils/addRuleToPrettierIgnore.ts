import { readdir, readFile, writeFile } from "node:fs/promises"

import { CommitType } from "@/constant"

import { getCommitMessage } from "./getCommitMessage"

/**
 * 向 .gitignore 文件添加规则
 * @param rules 要添加的规则列表
 * @returns commit message
 */
export async function addRuleToPrettierIgnore(...rules: string[]) {
    const dir = await readdir(".")
    const message = getCommitMessage(CommitType.feature, `添加 .prettierignore 规则 ${rules.join(", ")}`)

    if (!dir.includes(".prettierignore")) {
        await writeFile(".prettierignore", rules.join("\n"), "utf-8")
        return message
    }

    const prettierIgnore = await readFile(".prettierignore", "utf-8")
    const rules2 = prettierIgnore.split("\n").map(v => v.trim())

    for (const rule of rules) {
        if (rules2.includes(rule)) continue
        rules2.push(rule)
    }

    await writeFile(".prettierignore", rules2.join("\n"), "utf-8")
    return message
}
