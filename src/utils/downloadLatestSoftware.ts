import { mkdir } from "fs/promises"
import { download7Zip, downloadChrome, downloadDeskGo, downloadGeekUninstaller, downloadGit, downloadNodeJS, downloadVscode } from "."
import consola from "consola"
import dayjs from "dayjs"

import { Software } from "@constant/index"

import { downloadAnydesk } from "./downloadAnydesk"
import { downloadBun } from "./downloadBun"
import { downloadFirefox } from "./downloadFirefox"
import { downloadHoneyview } from "./downloadHoneyview"
import { downloadPotPlayer } from "./downloadPotPlayer"
import { downloadPowerToys } from "./downloadPowerToys"
import { getZixuluSetting } from "./getZixuluSetting"
import { setZixuluSetting } from "./setZixuluSetting"

export const SoftwareDownloadMap: Record<Software, (dir: string) => Promise<void>> = {
    [Software.Chrome]: downloadChrome,
    [Software.NodeJS]: downloadNodeJS,
    [Software["7zip"]]: download7Zip,
    [Software.Git]: downloadGit,
    [Software.DeskGo]: downloadDeskGo,
    [Software["Geek Uninstaller"]]: downloadGeekUninstaller,
    [Software["VS Code"]]: downloadVscode,
    [Software.PowerToys]: downloadPowerToys,
    [Software.Honeyview]: downloadHoneyview,
    [Software.AnyDesk]: downloadAnydesk,
    [Software.Firefox]: downloadFirefox,
    [Software.PotPlayer]: downloadPotPlayer,
    [Software.Bun]: downloadBun,
}

export async function downloadLatestSoftware() {
    consola.start("开始下载软件")
    const { default: inquirer } = await import("inquirer")
    const dir = `softwares-${dayjs().format("YYYYMMDDHHmmss")}`
    const setting = await getZixuluSetting()
    const softwareDownloadHistory = setting?.softwareDownloadHistory as Software[] | undefined
    const { softwares } = await inquirer.prompt({
        type: "checkbox",
        name: "softwares",
        message: "请选择要下载的软件",
        choices: Object.values(Software),
        default: softwareDownloadHistory?.filter(software => Object.values(Software).includes(software)) ?? Object.values(Software),
    })
    setting.softwareDownloadHistory = softwares
    await setZixuluSetting(setting)
    if (softwares.length === 0) return
    await mkdir(dir, { recursive: true })
    for (const software of softwares) {
        consola.start(`正在下载 ${software}`)
        await SoftwareDownloadMap[software as Software](dir)
    }
    consola.success("软件下载完成")
}
