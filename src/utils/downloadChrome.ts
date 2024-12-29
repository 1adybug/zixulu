import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 从 Winget 下载 Chrome 浏览器
 * @param dir 下载目标目录
 */
export async function downloadChrome(dir: string) {
    await downloadFromWinget({
        name: "Chrome",
        id: "Google.Chrome",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
