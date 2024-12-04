import { CommitType } from "@src/constant"
import { rm } from "fs/promises"
import { getCommitMessage } from "./getCommitMessage"

export async function removeLock() {
    await rm("package-lock.json", { force: true, recursive: true })
    await rm("yarn.lock", { force: true, recursive: true })
    await rm("pnpm-lock.yaml", { force: true, recursive: true })
    await rm("bun.lockb", { force: true, recursive: true })
    return getCommitMessage(CommitType.feature, "删除包管理 lock 文件")
}
