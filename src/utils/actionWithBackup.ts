import consola from "consola"

import { addGitCommit } from "./addGitCommit"
import { backupFirst } from "./backupFirst"
import { hasChangeNoCommit } from "./hasChangeNoCommit"
import { isRepository } from "./isRepository"

/**
 * 包装一个操作，在执行前进行备份
 * @param action 要执行的操作
 * @param message 提交信息
 * @returns 包装后的函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function actionWithBackup<T extends (...args: any[]) => Promise<string>>(action: T, message?: string): (...args: Parameters<T>) => Promise<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function actionWithBackup<T extends (...args: any[]) => Promise<void>>(action: T, message: string): (...args: Parameters<T>) => Promise<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function actionWithBackup(action: (...args: any[]) => Promise<string | void>, message?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (...args: any[]) => {
        const skip = await backupFirst()
        const msg = await action(...args)
        if (!(await isRepository()) || skip || !(await hasChangeNoCommit())) return
        const { default: inquirer } = await import("inquirer")
        const { commit } = await inquirer.prompt({
            type: "confirm",
            name: "commit",
            message: "是否自动提交代码",
            default: true,
        })
        if (!commit) return
        let commitMessage: string
        if (typeof message === "string") commitMessage = message
        else if (typeof msg === "string") commitMessage = msg
        else {
            consola.warn("请提供提交信息")
            throw new Error("请提供提交信息")
        }
        await addGitCommit(commitMessage)
    }
}
