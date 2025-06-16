import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 下载 Firefox 浏览器中文版
 * @param dir 下载目录
 */
export async function downloadFirefox(dir: string) {
    await downloadFromWinget({
        name: "Firefox",
        id: "Mozilla.Firefox.zh-CN",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
