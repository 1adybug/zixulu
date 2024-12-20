import { downloadFromWinget } from "./downloadFromWinget"

export async function downloadChrome(dir: string) {
    await downloadFromWinget({
        name: "Chrome",
        id: "Google.Chrome",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
