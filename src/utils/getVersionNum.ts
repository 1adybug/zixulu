/**
 * 获取版本号的数字部分
 * @param version 版本号
 * @returns 数字部分
 */
export function getVersionNum(version: string) {
    const reg = /^(\d+)(\.\d+)?(\.\d+)?/
    const result = version.match(reg)
    if (!result) throw new Error("无效的版本号")
    return Array.from(result)
        .slice(1)
        .map(str => (str ? parseInt(str.replace(/^\./, "")) : 0))
}
