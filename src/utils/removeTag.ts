import { simpleGit } from "simple-git"
import { consola } from "consola"
import { confirm } from "@inquirer/prompts"

import { preprocessRegex } from "./preprocessRegex"

export interface RemoveTagParams {
    /** 正则表达式字符串 */
    reg: string
    /** 正则表达式标志，如 i、g、m 等 */
    flags?: string
    /** 是否同时删除远程仓库的 tag */
    push?: boolean
    /** 远程仓库名称，默认为 origin */
    remote?: string
}

/**
 * 移除匹配的 git tag
 */
export async function removeTag({ reg, flags, push, remote = "origin" }: RemoveTagParams) {
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

    // 预处理正则表达式，替换占位符
    const processedReg = preprocessRegex(reg)

    // 显示正则表达式
    consola.box(`正则表达式: /${processedReg}/${flags ?? ""}`)

    // 询问用户是否继续
    const shouldContinue = await confirm({ message: "是否继续？", default: true })

    if (!shouldContinue) {
        consola.info("操作已取消")
        return
    }

    // 获取所有 tag
    const tags = await git.tags()
    const allTags = tags.all

    if (allTags.length === 0) {
        consola.warn("当前仓库没有任何 tag")
        return
    }

    consola.info(`找到 ${allTags.length} 个 tag`)

    const tagsToRemove = []

    // 遍历所有 tag，查找匹配的 tag
    for (const tag of allTags) {
        // 每次循环创建新的正则表达式，避免 g 标志可能带来的状态问题
        const regexp = new RegExp(processedReg, flags)

        // 如果 tag 匹配正则表达式，加入待删除列表
        if (regexp.test(tag)) {
            tagsToRemove.push(tag)
        }
    }

    if (tagsToRemove.length === 0) {
        consola.warn("没有匹配的 tag 需要删除")
        return
    }

    consola.info(`将要删除 ${tagsToRemove.length} 个 tag`)

    // 执行删除操作
    for (const tag of tagsToRemove) {
        try {
            // 删除本地 tag
            await git.tag(["-d", tag])
            consola.success(`本地: 删除 ${tag}`)

            // 如果需要删除远程仓库的 tag
            if (push) {
                try {
                    // 删除远程的 tag
                    await git.push([remote, "--delete", tag])
                    consola.success(`远程: 删除 ${tag}`)
                } catch (error) {
                    // 如果远程没有这个 tag，忽略错误
                    consola.warn(`远程可能不存在 ${tag}，跳过删除`)
                }
            }
        } catch (error) {
            consola.error(`删除 ${tag} 失败:`, error)
        }
    }

    consola.success("所有匹配的 tag 删除完成")
}

