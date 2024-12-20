import { downloadFromWinget } from "./downloadFromWinget"

export async function download7Zip(dir: string) {
    await downloadFromWinget({
        name: "7Zip",
        id: "7zip.7zip",
        dir,
        filter: item => item.Architecture === "x64" && item.InstallerType === "exe",
    })
}
