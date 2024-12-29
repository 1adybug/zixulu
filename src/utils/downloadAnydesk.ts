import { downloadFromWinget } from "./downloadFromWinget"

/**
 * 从 Winget 下载 AnyDesk 远程控制软件
 * @param dir 下载目标目录
 */
export async function downloadAnydesk(dir: string) {
    await downloadFromWinget({
        name: "AnyDesk",
        id: "AnyDeskSoftwareGmbH.AnyDesk",
        dir,
        filter: item => item.InstallerType === "exe",
    })
}
