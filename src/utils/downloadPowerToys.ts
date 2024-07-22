import { downloadFromWinget } from "."

export async function downloadPowerToys(dir: string) {
    await downloadFromWinget({
        name: "PowerToys",
        id: "Microsoft.PowerToys",
        dir,
        filter: item => item.Architecture === "x64" && item.Scope === "machine"
    })
}
