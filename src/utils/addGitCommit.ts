import consola from "consola"
import { execAsync } from "soda-nodejs"

/**
 * 添加 git 提交
 * @param message 提交信息
 */
export async function addGitCommit(message: string) {
    consola.start("提交代码")
    await execAsync("git add .")
    await execAsync(`git commit -m "${message}"`)
}
