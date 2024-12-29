import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 通过 winget 下载 VSCode
 * @param dir 下载目标目录
 */
export async function downloadVscode(dir: string) {
    await downloadFromWinget({
        name: "VSCode",
        id: "Microsoft.VisualStudioCode",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine",
    })
}
