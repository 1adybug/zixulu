import { simpleGit } from "simple-git"
import { consola } from "consola"

export interface ReplaceTagParams {
    /** 正则表达式字符串 */
    reg: string
    /** 替换字符串 */
    replace: string
    /** 正则表达式标志，如 i、g、m 等 */
    flags?: string
    /** 是否推送到远程仓库 */
    push?: boolean
    /** 远程仓库名称，默认为 origin */
    remote?: string
}

/**
 * 替换所有 git tag
 */
export async function replaceTag({ reg, replace, flags, push, remote = "origin" }: ReplaceTagParams) {
    const git = simpleGit()

    // 检查是否是 git 仓库
    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
        consola.error("当前目录不是 git 仓库")
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

    const operations = []

    // 遍历所有 tag，准备操作
    for (const tag of allTags) {
        // 每次循环创建新的正则表达式，避免 g 标志可能带来的状态问题
        const regexp = new RegExp(reg, flags)
        const newTag = tag.replace(regexp, replace)

        // 如果替换后的 tag 名称没有变化，跳过
        if (newTag === tag) {
            continue
        }

        operations.push({ oldTag: tag, newTag })
    }

    if (operations.length === 0) {
        consola.warn("没有需要替换的 tag")
        return
    }

    consola.info(`将要替换 ${operations.length} 个 tag`)

    // 执行替换操作
    for (const { oldTag, newTag } of operations) {
        try {
            // 获取旧 tag 指向的 commit
            const tagInfo = await git.raw(["rev-list", "-n", "1", oldTag])
            const commitHash = tagInfo.trim()

            // 创建新 tag
            await git.addTag(newTag)
            await git.raw(["tag", "-f", newTag, commitHash])

            // 删除旧 tag
            await git.tag(["-d", oldTag])

            consola.success(`本地: ${oldTag} -> ${newTag}`)

            // 如果需要推送到远程仓库
            if (push) {
                try {
                    // 删除远程的旧 tag
                    await git.push([remote, "--delete", oldTag])
                    consola.success(`远程: 删除 ${oldTag}`)
                } catch (error) {
                    // 如果远程没有这个 tag，忽略错误
                    consola.warn(`远程可能不存在 ${oldTag}，跳过删除`)
                }

                try {
                    // 推送新 tag 到远程
                    await git.push([remote, newTag])
                    consola.success(`远程: 推送 ${newTag}`)
                } catch (error) {
                    consola.error(`推送 ${newTag} 到远程失败:`, error)
                }
            }
        } catch (error) {
            consola.error(`替换 ${oldTag} 失败:`, error)
        }
    }

    consola.success("所有 tag 替换完成")
}
