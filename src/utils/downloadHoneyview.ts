import { downloadFromWinget } from "./downloadFromWinget"

export async function downloadHoneyview(dir: string) {
    await downloadFromWinget({
        name: "Honeyview",
        id: "Bandisoft.Honeyview",
        dir,
        filter: item => item.InstallerLocale === "en-US",
    })
}
