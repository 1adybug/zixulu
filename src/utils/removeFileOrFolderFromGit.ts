import consola from "consola"
import { stat } from "fs/promises"
import { execAsync } from "soda-nodejs"
import { backupFirst } from "./backupFirst"

/** 
 * 从 git 中删除文件或文件夹
 * @param input 文件或文件夹路径
 */
export async function removeFileOrFolderFromGit(input: string) {
    const stats = await stat(input)
    const recursive = stats.isDirectory()
    await backupFirst(true)
    consola.start(`开始从 git 中删除 ${input}`)
    await execAsync(`git filter-branch --force --index-filter "git rm${recursive ? " -r" : ""} --cached --ignore-unmatch ${input}" --prune-empty --tag-name-filter cat -- --all`)
    consola.success(`从 git 中删除 ${input} 成功`)
}
