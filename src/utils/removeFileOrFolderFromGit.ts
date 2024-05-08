import consola from "consola"
import { stat } from "fs/promises"
import { backupFirst, execAsync } from "."

export async function removeFileOrFolderFromGit(path: string) {
    const stats = await stat(path)
    const recursive = stats.isDirectory()
    await backupFirst(true)
    consola.start(`开始从 git 中删除 ${path}`)
    await execAsync(`git filter-branch --force --index-filter "git rm${recursive ? " -r" : ""} --cached --ignore-unmatch ${path}" --prune-empty --tag-name-filter cat -- --all`)
    consola.success(`从 git 中删除 ${path} 成功`)
}
