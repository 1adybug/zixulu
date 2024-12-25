import { downloadFromWinget } from "./downloadFromWinget"

export async function downloadGit(dir: string) {
    await downloadFromWinget({
        name: "Git",
        id: "Git.Git",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine",
    })
}
