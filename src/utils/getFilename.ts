import { type Headers as NodeFetchHeaders } from "node-fetch"

export function getFilename(headers: Headers | NodeFetchHeaders) {
    const disposition = headers.get("content-disposition")
    if (!disposition) return undefined
    const reg = /filename=(.+?);/
    const result = disposition.match(reg)
    if (!result) return undefined
    return result[1]
}
