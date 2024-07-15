import { downloadFromWinget } from "."

export async function downloadAnydesk(dir: string) {
    await downloadFromWinget({
        name: "AnyDesk",
        id: "AnyDeskSoftwareGmbH.AnyDesk",
        dir
    })
}
