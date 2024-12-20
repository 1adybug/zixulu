import { downloadFromWinget } from "./downloadFromWinget"

export async function downloadVscode(dir: string) {
    await downloadFromWinget({
        name: "VSCode",
        id: "Microsoft.VisualStudioCode",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine",
    })
}
