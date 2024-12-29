import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 下载 Git 版本控制工具
 * @param dir 下载目录
 */
export async function downloadGit(dir: string) {
    await downloadFromWinget({
        name: "Git",
        id: "Git.Git",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine",
    })
}
