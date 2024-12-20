import { download } from "./download"

export async function downloadHoneyview(dir: string) {
    await download("https://www.bandisoft.com/honeyview/dl.php?web", dir, "Honeyview-5.53-neutral.exe")
}
