import { exit } from "process"
import consola from "consola"

import { hasChangeNoCommit } from "./hasChangeNoCommit"
import { isRepository } from "./isRepository"
import { shouldContinue } from "./shouldContinue"

/**
 * 检查当前项目是否需要备份
 * 如果是 git 仓库且有未提交的更改，提示用户是否继续
 * 如果不是 git 仓库，建议用户备份代码
 *
 * @param forceRepo 是否强制要求是 git 仓库
 * @returns 如果是 git 仓库且检测到未提交的更改，选择继续则返回 true
 */
export async function backupFirst(forceRepo = false): Promise<true | void> {
    if (!(await isRepository())) {
        if (forceRepo) {
            consola.error("git 不可用")
            throw new Error("git 不可用")
        }
        consola.warn("建议使用前备份代码")
        const cont = await shouldContinue()
        if (!cont) exit()
        return
    }
    if (await hasChangeNoCommit()) {
        consola.warn("建议使用前提交代码")
        const cont = await shouldContinue()
        if (!cont) exit()
        return true
    }
}
