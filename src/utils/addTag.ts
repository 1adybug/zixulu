import { simpleGit } from "simple-git"
import { consola } from "consola"

import { preprocessRegex } from "./preprocessRegex"
import { shouldContinue } from "./shouldContinue"

export interface AddTagParams {
    /** 用于匹配 commit message 的正则表达式字符串 */
    reg: string
    /** 正则表达式标志，如 i、g、m 等 */
    flags?: string
    /** 用于替换的字符串模板，生成 tag 名称 */
    replacement: string
    /** 是否同时推送到远程仓库 */
    push?: boolean
    /** 远程仓库名称，默认为 origin */
    remote?: string
    /** 是否覆盖已存在的 tag */
    force?: boolean
}

/**
 * 为匹配的 commit 添加 git tag
 */
export async function addTag({ reg, flags, replacement, push, remote = "origin", force }: AddTagParams) {
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

    // 显示正则表达式和替换字符串
    consola.box(`正则表达式: /${processedReg}/${flags ?? ""}\n替换字符串: ${replacement}`)

    // 询问用户是否继续
    const cont = await shouldContinue("是否继续？")

    if (!cont) {
        consola.info("操作已取消")
        return
    }

    // 获取所有 commit 日志
    const log = await git.log()
    const commits = log.all

    if (commits.length === 0) {
        consola.warn("当前仓库没有任何 commit")
        return
    }

    consola.info(`找到 ${commits.length} 个 commit`)

    // 获取所有已存在的 tag
    const existingTags = await git.tags()
    const allExistingTags = new Set(existingTags.all)

    const tagsToAdd = []

    // 遍历所有 commit，查找匹配的 commit message
    for (const commit of commits) {
        // 每次循环创建新的正则表达式，避免 g 标志可能带来的状态问题
        const regexp = new RegExp(processedReg, flags)

        // 如果 commit message 匹配正则表达式
        if (regexp.test(commit.message)) {
            // 使用正则替换生成 tag 名称
            const tagName = commit.message.replace(new RegExp(processedReg, flags), replacement)

            // 检查 tag 名称是否有效
            if (tagName && tagName.trim()) {
                tagsToAdd.push({
                    hash: commit.hash,
                    message: commit.message,
                    tagName: tagName.trim(),
                })
            }
        }
    }

    if (tagsToAdd.length === 0) {
        consola.warn("没有匹配的 commit 需要添加 tag")
        return
    }

    consola.info(`将要为 ${tagsToAdd.length} 个 commit 添加 tag`)

    // 执行添加操作
    for (const { hash, message, tagName } of tagsToAdd) {
        try {
            // 检查 tag 是否已存在
            if (allExistingTags.has(tagName)) {
                if (force) {
                    // 如果强制覆盖，先删除已存在的 tag
                    await git.tag(["-d", tagName])
                    consola.info(`删除已存在的 tag: ${tagName}`)
                } else {
                    consola.warn(`tag ${tagName} 已存在，跳过 (使用 force 选项可覆盖)`)
                    continue
                }
            }

            // 为指定的 commit 添加 tag
            await git.tag([tagName, hash])
            consola.success(`本地: 为 commit ${hash.substring(0, 7)} (${message.substring(0, 50)}...) 添加 tag ${tagName}`)

            // 如果需要推送到远程仓库
            if (push) {
                try {
                    // 推送 tag 到远程
                    const pushArgs = force ? [remote, tagName, "--force"] : [remote, tagName]
                    await git.push(pushArgs)
                    consola.success(`远程: 推送 tag ${tagName}`)
                } catch (error) {
                    consola.error(`推送 tag ${tagName} 到远程失败:`, error)
                }
            }
        } catch (error) {
            consola.error(`为 commit ${hash} 添加 tag ${tagName} 失败:`, error)
        }
    }

    consola.success("所有匹配的 tag 添加完成")
}

