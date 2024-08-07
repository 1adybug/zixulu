
 
/**
 * 将浏览器中直接复制的 headers 转换为对象
 * @param str 复制的 headers
 * @returns headers 对象
 */
export async function getHeaders() {
    const { default: clipboard } = await import("clipboardy")
    const str = await clipboard.read()
    const reg = /^(.+?):$[\n\r]*^(.+?)$/gm
    const reg2 = new RegExp(reg.source, "m")
    const result = [`const headers = new Headers()`]
    const match = str.match(reg)
    if (!match) throw new Error("headers 格式错误")
    Array.from(match).forEach(item => {
        const match2 = item.match(reg2)
        result.push (`headers.set("${match2![1].trim()}", \`${match2![2].trim()}\`)`)
    })
    await clipboard.write(result.join("\n"))
}
