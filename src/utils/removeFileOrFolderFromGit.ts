import consola from "consola"
import { backupFirst, execAsync } from "."

export type RemoveFileOrFolderFromGitOptions = {
    recursive?: boolean
}

export async function removeFileOrFolderFromGit(path: string, options?: RemoveFileOrFolderFromGitOptions) {
    const { recursive = false } = options || {}
    await backupFirst(true)
    consola.start(`开始从 git 中删除 ${path}`)
    await execAsync(`git filter-branch --force --index-filter "git rm${recursive ? " -r" : ""} --cached --ignore-unmatch ${path}" --prune-empty --tag-name-filter cat -- --all`)
    consola.success(`从 git 中删除 ${path} 成功`)
}
