import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 下载 PotPlayer 播放器
 * @param dir 下载目录
 */
export async function downloadPotPlayer(dir: string) {
    await downloadFromWinget({
        name: "PotPlayer",
        id: "Daum.PotPlayer",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
