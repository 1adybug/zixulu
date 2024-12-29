/**
 * 通过 winget 下载 PowerToys
 * @param dir 下载目标目录
 */
import { downloadFromWinget } from "./downloadFromWinget"

export async function downloadPowerToys(dir: string) {
    await downloadFromWinget({
        name: "PowerToys",
        id: "Microsoft.PowerToys",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine",
    })
}
