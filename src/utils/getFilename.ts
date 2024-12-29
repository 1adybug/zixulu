import { type Headers as NodeFetchHeaders } from "node-fetch"

/**
 * 从 HTTP headers 中提取文件名
 * @param headers HTTP headers对象
 * @returns 文件名，如果未找到则返回 undefined
 */
export function getFilename(headers: Headers | NodeFetchHeaders) {
    const disposition = headers.get("content-disposition")
    if (!disposition) return undefined
    const reg = /filename=(.+?);/
    const result = disposition.match(reg)
    if (!result) return undefined
    return result[1]
}
