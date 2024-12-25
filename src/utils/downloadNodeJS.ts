import { downloadFromWinget } from "./downloadFromWinget"

export async function downloadNodeJS(dir: string) {
    await downloadFromWinget({
        name: "NodeJS",
        id: "OpenJS.NodeJS.LTS",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
