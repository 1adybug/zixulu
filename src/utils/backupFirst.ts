import consola from "consola"
import { exit } from "process"
import { hasChangeNoCommit } from "./hasChangeNoCommit"
import { isRepository } from "./isRepository"
import { shouldContinue } from "./shouldContinue"

/**
 * @param [forceRepo=false] 是否强制认为是 git 目录
 * @returns 如果是 git 目录且检测到未提交的更改，选择继续，则返回 true，否则返回 undefined
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
