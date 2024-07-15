import { downloadFromWinget } from "."

export async function downloadFirefox(dir: string) {
    await downloadFromWinget({
        name: "Firefox",
        id: "Mozilla.Firefox",
        dir
    })
}
