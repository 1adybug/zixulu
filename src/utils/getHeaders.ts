import clipboard from "clipboardy"

/**
 * 将浏览器中直接复制的 headers 转换为对象
 * 此函数从剪贴板读取 headers 文本，并转换为 Headers 对象的初始化代码
 * @returns void - 将生成的代码写入剪贴板
 * @throws Error 当 headers 格式不正确时抛出错误
 */
export async function getHeaders() {
    const str = await clipboard.read()
    const reg = /^(.+?):$[\n\r]*^(.+?)$/gm
    const reg2 = new RegExp(reg.source, "m")

    const result = [`const headers = new Headers()`]

    const match = str.match(reg)
    if (!match) throw new Error("headers 格式错误")

    Array.from(match).forEach(item => {
        const match2 = item.match(reg2)
        result.push(
            `headers.set("${match2![1].trim()}", \`${match2![2].trim()}\`)`,
        )
    })

    await clipboard.write(result.join("\n"))
}
