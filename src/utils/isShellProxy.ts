import { execAsync } from "soda-nodejs"

/**
 * 检测是否开启了 Shell 代理
 */
export async function isShellProxy() {
    const result = await execAsync("netsh winhttp show proxy", {
        encoding: "buffer",
        decode: { encoding: "gbk" }
    })
    return !result.includes("直接访问")
}
