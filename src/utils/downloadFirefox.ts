import { downloadFromWinget } from "."

export async function downloadFirefox(dir: string) {
    await downloadFromWinget({
        name: "Firefox",
        id: "Mozilla.Firefox",
        dir,
        filter: item => item.Architecture === "x64" && item.InstallerType === "exe" && item.InstallerLocale === "zh-CN",
    })
}
