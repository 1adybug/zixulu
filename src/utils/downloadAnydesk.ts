import { downloadFromWinget } from "./downloadFromWinget"

export async function downloadAnydesk(dir: string) {
    await downloadFromWinget({
        name: "AnyDesk",
        id: "AnyDeskSoftwareGmbH.AnyDesk",
        dir,
        filter: item => item.InstallerType === "exe",
    })
}
