import { downloadFromWinget } from "."

export async function downloadHoneyview(dir: string) {
    await downloadFromWinget({
        name: "Honeyview",
        id: "Bandisoft.Honeyview",
        dir
    })
}
