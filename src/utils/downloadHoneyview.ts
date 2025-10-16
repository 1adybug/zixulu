import { download } from "./download"

/**
 * 下载 Honeyview 图片查看器
 * @param dir 下载目录
 */
export async function downloadHoneyview(dir: string) {
    await download(
        "https://www.bandisoft.com/honeyview/dl.php?web",
        dir,
        "Honeyview-5.53-neutral.exe",
    )
}
