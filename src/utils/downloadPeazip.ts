import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 下载 peazip 压缩软件
 * @param dir 下载目录
 */
export async function downloadPeaZip(dir: string) {
    await downloadFromWinget({
        name: "PeaZip",
        id: "Giorgiotani.Peazip",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
