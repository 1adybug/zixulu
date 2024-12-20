import { execSync } from "child_process"
import consola from "consola"
import simpleGit from "simple-git"
import { spawnAsync } from "soda-nodejs"

const git = simpleGit()

export type CommitAuthor = {
    name?: string
    email?: string
}

export type ReplaceCommitAuthorParams = {
    prev?: CommitAuthor
    next?: CommitAuthor
}

// 执行 Git 历史重写的函数
export async function replaceCommitAuthor({
    prev: { name: prevName, email: prevEmail } = {},
    next: { name: nextName, email: nextEmail } = {},
}: ReplaceCommitAuthorParams) {
    if (!nextName && !nextEmail) throw new Error("新的作者信息不能为空。请提供新的作者名称或邮箱。")
    const isRepo = await git.checkIsRepo()
    if (!isRepo) throw new Error("当前目录不是一个 Git 仓库。请在一个有效的 Git 仓库中运行此命令。")
    const status = await git.status()
    if (status.files.length) throw new Error("当前 Git 仓库存在未提交的文件。请提交或暂存这些文件后再试。")
    consola.start("开始修改 Git 提交历史...")
    console.log()
    const committerName = nextName ? ` export GIT_COMMITTER_NAME="${nextName}"` : ""
    const committerEmail = nextEmail ? ` export GIT_COMMITTER_EMAIL="${nextEmail}"` : ""
    const authorName = nextName ? ` export GIT_AUTHOR_NAME="${nextName}"` : ""
    const authorEmail = nextEmail ? ` export GIT_AUTHOR_EMAIL="${nextEmail}"` : ""
    const committerCondition =
        prevName && prevEmail
            ? `[ "$GIT_COMMITTER_NAME" = "${prevName}" ] && [ "$GIT_COMMITTER_EMAIL" = "${prevEmail}" ]`
            : prevName
              ? `[ "$GIT_COMMITTER_NAME" = "${prevName}" ]`
              : prevEmail
                ? `[ "$GIT_COMMITTER_EMAIL" = "${prevEmail}" ]`
                : "[ true ]"
    const authorCondition =
        prevName && prevEmail
            ? `[ "$GIT_AUTHOR_NAME" = "${prevName}" ] && [ "$GIT_AUTHOR_EMAIL" = "${prevEmail}" ]`
            : prevName
              ? `[ "$GIT_AUTHOR_NAME" = "${prevName}" ]`
              : prevEmail
                ? `[ "$GIT_AUTHOR_EMAIL" = "${prevEmail}" ]`
                : "[ true ]"

    const filterScript = `
    if ${committerCondition}; then
        ${committerName}${committerEmail}
    fi
    if ${authorCondition}; then
        ${authorName}${authorEmail}
    fi
`
    await spawnAsync("git", ["filter-branch", "-f", "--env-filter", filterScript, "--tag-name-filter", "cat", "--", "--branches", "--tags"], {
        stdio: "inherit",
    })
    console.log()
    consola.success("Git 提交历史修改完成！")
    consola.warn("请强制推送以覆盖远程仓库：git push --force")
}
