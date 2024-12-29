import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 下载 NodeJS LTS 版本
 * @param dir 下载目录
 */
export async function downloadNodeJS(dir: string) {
    await downloadFromWinget({
        name: "NodeJS",
        id: "OpenJS.NodeJS.LTS",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
