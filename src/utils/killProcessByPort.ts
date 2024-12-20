import { exec } from "child_process"
import consola from "consola"

import { getPidInfoFromPort, getProcessInfoFromPid } from "./processInfo"

export async function killProcessByPort(port: string | number) {
    port = typeof port === "string" ? parseInt(port) : port
    if (!Number.isInteger(port)) {
        consola.error("无效的端口号")
        throw new Error("无效的端口号")
    }
    const { default: inquirer } = await import("inquirer")
    const pidInfos = await getPidInfoFromPort(port)
    const choices: { name: string; value: number }[] = []
    for (const { pid, info } of pidInfos) {
        const name = await getProcessInfoFromPid(pid)
        if (name) choices.push({ name: `${info} ${name}`, value: pid })
    }
    if (choices.length === 0) {
        consola.warn("没有找到对应的进程")
        return
    }
    const { chosenPids } = await inquirer.prompt({
        type: "checkbox",
        name: "chosenPids",
        message: "请选择要结束的进程",
        choices,
        default: choices.map(choice => choice.value),
    })
    for (const pid of chosenPids) {
        exec(`taskkill /f /pid ${pid}`)
    }
}
