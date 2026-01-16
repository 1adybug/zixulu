import { stat } from "node:fs/promises"

import consola from "consola"
import inquirer from "inquirer"
import { spawnAsync } from "soda-nodejs"

import { backupFirst } from "./backupFirst"

/**
 * 从 git 中删除文件或文件夹
 * @param input 文件或文件夹路径
 */
export async function removeFileOrFolderFromGit(input: string) {
    input = input.replace(/\\/g, "/")
    let recursive = false

    try {
        const stats = await stat(input)
        recursive = stats.isDirectory()
    } catch {
        type Answer = {
            recursive: boolean
        }

        const answer = await inquirer.prompt<Answer>({
            type: "confirm",
            name: "recursive",
            message: "是否是文件夹",
            default: false,
        })
        recursive = answer.recursive
    }

    await backupFirst(true)
    consola.start(`开始从 git 中删除 ${input}`)
    await spawnAsync(
        `git filter-branch --force --index-filter "git rm${recursive ? " -r" : ""} --cached --ignore-unmatch ${input}" --prune-empty --tag-name-filter cat -- --all`,
    )
    consola.success(`从 git 中删除 ${input} 成功`)
}
