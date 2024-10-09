import { downloadFromWinget } from "."

export async function downloadPotPlayer(dir: string) {
    await downloadFromWinget({
        name: "PotPlayer",
        id: "Daum.PotPlayer",
        dir,
        filter: item => item.Architecture === "x64",
    })
}
