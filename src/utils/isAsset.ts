/**
 * 判断一个 url 是否是资源链接
 * @param url 链接
 * @returns 是否是资源链接
 */
export function isAsset(url: string) {
    const lower = url.toLowerCase()
    return lower.endsWith(".svg") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") || lower.endsWith(".webp") || lower.endsWith(".ico") || lower.endsWith(".ttf") || lower.endsWith(".woff") || lower.endsWith(".woff2") || lower.endsWith(".css") || lower.endsWith(".js") || lower.endsWith(".json") || lower.includes("/img/") || lower.includes("/file/") || lower.includes("/assets/")
}
