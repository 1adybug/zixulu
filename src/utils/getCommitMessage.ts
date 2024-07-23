import { CommitType, CommitTypeMap } from "@src/constant"

/** 
 * 获取提交信息
 * @param type 类型
 * @param message 信息
 * @returns 提交信息
 */
export function getCommitMessage(type: CommitType, message: string) {
    return `${CommitTypeMap[type]}${message}`
}
