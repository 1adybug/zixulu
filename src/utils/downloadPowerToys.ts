import { downloadFromWinget } from "."

export async function downloadPowerToys(dir: string) {
    await downloadFromWinget({
        name: "PowerToys",
        id: "Microsoft.PowerToys",
        dir,
        architecture: "x64"
    })
}
