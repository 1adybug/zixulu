import { readdir, rename } from "fs/promises"
import { join } from "path"

import { downloadFromPCQQ } from "./downloadFromPCQQ"

export async function downloadDeskGo(dir: string) {
    await downloadFromPCQQ(dir, 3318, 23125)
    const dir2 = await readdir(dir)
    const file = dir2.find(item => item.startsWith("DeskGo"))!
    await rename(
        join(dir, file),
        join(
            dir,
            file.replace(/^DeskGo_(.+)_full\.exe$/, (match, arg) => `DeskGo-${arg.replace(/\_/g, ".")}-x64.exe`),
        ),
    )
}
