/**
 * 获取版本号的数字部分
 * @param version 版本号
 * @returns 数字部分
 */
export function getVersionNum(version: string) {
    const reg = /^(\D*)(\d+)(\.\d+)*/
    const match = version.match(reg)
    if (!match) throw new Error("无效的版本号")
    return match[0]
}
