import { unlink, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

import { consola } from "consola"
import { simpleGit } from "simple-git"
import { spawnAsync } from "soda-nodejs"

import { preprocessRegex } from "./preprocessRegex"
import { shouldContinue } from "./shouldContinue"

export interface ReplaceCommitMessageParams {
    /** 正则表达式字符串 */
    reg: string
    /** 替换字符串 */
    replace: string
    /** 正则表达式标志，如 i、g、m 等 */
    flags?: string
    /** 是否强制推送到远程仓库 */
    push?: boolean
    /** 远程仓库名称，默认为 origin */
    remote?: string
    /** 分支名称，默认为当前分支 */
    branch?: string
}

/**
 * 替换所有提交消息
 * ⚠️ 警告：此操作会重写 Git 历史，请谨慎使用
 */
export async function replaceCommitMessage({ reg, replace, flags, push, remote = "origin", branch }: ReplaceCommitMessageParams) {
    const git = simpleGit()

    // 检查是否是 git 仓库
    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
        consola.error("当前目录不是 git 仓库")
        return
    }

    // 检查是否有未提交的更改
    const status = await git.status()

    if (status.files.length > 0) {
        consola.error("当前 Git 仓库存在未提交的文件，请先提交或暂存这些文件")
        return
    }

    // 获取当前分支
    const currentBranch = branch ?? (await git.revparse(["--abbrev-ref", "HEAD"]))

    // 预处理正则表达式，替换占位符
    const processedReg = preprocessRegex(reg)

    consola.warn("⚠️  警告：此操作将重写 Git 历史，建议先备份")
    consola.info(`目标分支: ${currentBranch}`)

    // 显示正则表达式和替换字符串
    consola.info(`正则表达式: /${processedReg}/${flags ?? ""}`)

    consola.info(`替换字符串: ${replace}`)

    // 询问用户是否继续
    const cont = await shouldContinue("⚠️ 是否继续？此操作将重写 Git 历史")

    if (!cont) {
        consola.info("操作已取消")
        return
    }

    // 获取提交数量
    const logResult = await git.log([currentBranch])
    const commitCount = logResult.total

    consola.info(`找到 ${commitCount} 个提交`)

    // 创建临时脚本文件，避免转义问题
    const tempScriptPath = join(tmpdir(), `git-msg-filter-${Date.now()}.js`)

    // 生成 Node.js 脚本内容
    const scriptContent = `
const reg = ${JSON.stringify(processedReg)}
const replace = ${JSON.stringify(replace)}
const flags = ${JSON.stringify(flags ?? "")}

let input = ""

process.stdin.on("data", chunk => {
    input += chunk.toString()
})

process.stdin.on("end", () => {
    const regexp = new RegExp(reg, flags)
    const result = input.replace(regexp, replace)
    process.stdout.write(result)
})
`

    // 清理之前可能存在的 filter-branch 引用
    try {
        await git.raw(["update-ref", "-d", `refs/original/refs/heads/${currentBranch}`])
        consola.info("清理了之前的 filter-branch 引用")
    } catch {
        // 如果不存在引用，忽略错误
    }

    consola.start("开始替换提交消息...")

    try {
        // 写入临时脚本文件
        await writeFile(tempScriptPath, scriptContent, "utf-8")

        // 使用 filter-branch 重写提交消息
        // 在 Windows 上，路径需要使用正斜杠或双引号包裹
        // 将反斜杠转换为正斜杠，Node.js 在 Windows 上也支持这种格式
        const scriptPathForCommand = tempScriptPath.replace(/\\/g, "/")

        const filterCommand = `git filter-branch -f --msg-filter "node \\"${scriptPathForCommand}\\"" -- ${currentBranch}`

        await spawnAsync(filterCommand)

        // 删除临时脚本文件
        await unlink(tempScriptPath)

        consola.success("提交消息替换完成")

        // 如果需要推送到远程仓库
        if (push) {
            consola.start(`强制推送到远程仓库 ${remote}...`)

            try {
                await git.push([remote, currentBranch, "--force"])
                consola.success(`已强制推送到 ${remote}/${currentBranch}`)
            } catch (error) {
                consola.error(`推送到远程失败:`, error)
                consola.warn(`你可以手动执行: git push ${remote} ${currentBranch} --force`)
            }
        } else {
            consola.warn(`如需推送到远程，请执行: git push ${remote} ${currentBranch} --force`)
        }
    } catch (error) {
        consola.error("替换提交消息失败:", error)
        consola.info("如果出现错误，可以使用以下命令恢复:")
        consola.info("git reset --hard refs/original/refs/heads/" + currentBranch)

        // 确保删除临时脚本文件
        try {
            await unlink(tempScriptPath)
        } catch {
            // 忽略删除失败的错误
        }
    }
}
