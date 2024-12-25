import { readFile, writeFile } from "fs/promises"
import { execAsync } from "soda-nodejs"

import { isSudo } from "@src/constant"

import { sudoCommand } from "./sudoCommand"
import { unique } from "./unique"

export async function setDockerRegistry() {
    if (!isSudo) return sudoCommand()
    await execAsync(`mkdir -p /etc/docker`)
    let daemon: any = {}
    try {
        daemon = JSON.parse(await readFile("/etc/docker/daemon.json", "utf-8"))
    } catch {}
    daemon["registry-mirrors"] ??= []
    daemon["registry-mirrors"].push("https://docker.sunzishaokao.com", "https://hub.hxui.site", "https://docker.1ms.run")
    daemon["registry-mirrors"] = unique(daemon["registry-mirrors"])
    daemon["exec-opts"] ??= []
    daemon["exec-opts"].push("native.cgroupdriver=systemd")
    daemon["exec-opts"] = unique(daemon["exec-opts"])
    const { default: inquirer } = await import("inquirer")
    type Answer = {
        mirrors: string
    }
    const { mirrors } = await inquirer.prompt<Answer>([
        {
            type: "input",
            name: "mirrors",
            message: "请输入镜像地址，多个用逗号分隔，留空则跳过",
        },
    ])
    daemon["registry-mirrors"].push(...mirrors.split(/[,，]/))
    await writeFile("/etc/docker/daemon.json", JSON.stringify(daemon, undefined, 4), "utf-8")
    await execAsync("systemctl daemon-reload")
    await execAsync("systemctl restart docker")
}
