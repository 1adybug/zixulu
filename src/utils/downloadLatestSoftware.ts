import { mkdir } from "fs/promises"

import consola from "consola"
import dayjs from "dayjs"
import inquirer from "inquirer"

import { Software } from "@/constant/index"

import { download7Zip } from "./download7Zip"
import { downloadAnydesk } from "./downloadAnydesk"
import { downloadBun } from "./downloadBun"
import { downloadChrome } from "./downloadChrome"
import { downloadDeskGo } from "./downloadDeskGo"
import { downloadFirefox } from "./downloadFirefox"
import { downloadGeekUninstaller } from "./downloadGeekUninstaller"
import { downloadGit } from "./downloadGit"
import { downloadHoneyview } from "./downloadHoneyview"
import { downloadNodeJS } from "./downloadNodeJS"
import { downloadPeaZip } from "./downloadPeazip"
import { downloadPotPlayer } from "./downloadPotPlayer"
import { downloadPowerShell } from "./downloadPowerShell"
import { downloadPowerToys } from "./downloadPowerToys"
import { downloadVscode } from "./downloadVscode"
import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

/**
 * 软件下载函数映射表
 * 键为软件名称，值为对应的下载函数
 */
export const SoftwareDownloadMap: Record<
    Software,
    (dir: string) => Promise<void>
> = {
    [Software.Chrome]: downloadChrome,
    [Software.NodeJS]: downloadNodeJS,
    [Software["7zip"]]: download7Zip,
    [Software["PeaZip"]]: downloadPeaZip,
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
    [Software.PowerShell]: downloadPowerShell,
}

/**
 * 交互式下载最新版本的软件
 * 1. 提示用户选择要下载的软件
 * 2. 创建下载目录
 * 3. 依次下载选中的软件
 */
export async function downloadLatestSoftware() {
    consola.start("开始下载软件")
    const dir = `softwares-${dayjs().format("YYYYMMDDHHmmss")}`
    const setting = await readZixuluSetting()
    const softwareDownloadHistory = setting?.softwareDownloadHistory as
        | Software[]
        | undefined
    const { softwares } = await inquirer.prompt({
        type: "checkbox",
        name: "softwares",
        message: "请选择要下载的软件",
        choices: Object.values(Software),
        default:
            softwareDownloadHistory?.filter(software =>
                Object.values(Software).includes(software)) ??
            Object.values(Software),
    })
    setting.softwareDownloadHistory = softwares
    await writeZixuluSetting(setting)
    if (softwares.length === 0) return
    await mkdir(dir, { recursive: true })

    for (const software of softwares) {
        consola.start(`正在下载 ${software}`)
        await SoftwareDownloadMap[software as Software](dir)
    }

    consola.success("软件下载完成")
}
