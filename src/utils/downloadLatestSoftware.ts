import consola from "consola"
import { mkdir } from "fs/promises"
import { Software } from "../constant"
import { SoftwareDownloadMap } from "."

export async function downloadLatestSoftware() {
    consola.start("开始下载软件")
    const { default: inquirer } = await import("inquirer")
    const dir = `softwares-${Date.now()}`
    const { softwares } = await inquirer.prompt({
        type: "checkbox",
        name: "softwares",
        message: "请选择要下载的软件",
        choices: Object.values(Software),
        default: Object.values(Software)
    })
    if (softwares.length === 0) return
    await mkdir(dir, { recursive: true })
    for (const software of softwares) {
        consola.start(`正在下载 ${software}`)
        await SoftwareDownloadMap[software as Software](dir)
    }
    consola.success("软件下载完成")
}
