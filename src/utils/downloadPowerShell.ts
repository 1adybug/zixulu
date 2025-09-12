import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 下载 PowerShell
 * @param dir 下载目录
 */
export async function downloadPowerShell(dir: string) {
    await downloadFromWinget({
        name: "PowerShell",
        id: "Microsoft.PowerShell",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
