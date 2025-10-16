import consola from "consola"
import { execAsync } from "soda-nodejs"

export interface AddGitCommitParams {
    message: string
    cwd?: string
}

/**
 * 添加 git 提交
 * @param message 提交信息
 */
export async function addGitCommit(
    messageOrParams: string | AddGitCommitParams,
) {
    const { message, cwd } =
        typeof messageOrParams === "string"
            ? { message: messageOrParams }
            : messageOrParams
    consola.start("提交代码")
    await execAsync("git add .", { cwd })
    await execAsync(`git commit -m "${message}"`, { cwd })
}
