import { readdir, rm } from "fs/promises"

import inquirer from "inquirer"
import { JSDOM } from "jsdom"
import { execAsync } from "soda-nodejs"

import { isSudo } from "@/constant"

import { setDockerRegistry } from "./setDockerRegistry"
import { sudoCommand } from "./sudoCommand"

export async function installDocker() {
    if (!isSudo) return sudoCommand()
    const info = await execAsync("lsb_release -a")
    const distributorId = info.match(/Distributor ID:\s+(.+)/)?.[1]
    if (distributorId !== "Ubuntu") throw new Error("暂不支持 Ubuntu 以外的系统")
    const codename = info.trim().match(/Codename:\s+(.+)/)?.[1]
    if (!codename) throw new Error("无法获取 codename")
    const response = await fetch(`https://download.docker.com/linux/ubuntu/dists/${codename}/pool/stable/amd64/`)
    const data = await response.text()
    const dom = new JSDOM(data)
    const hrefs = Array.from(dom.window.document.querySelectorAll("a")).map(({ href }) => href)
    const deb = hrefs.findLast(item => item.startsWith("containerd.io_"))!
    const deb2 = hrefs.findLast(item => item.startsWith("docker-ce_"))!
    const deb3 = hrefs.findLast(item => item.startsWith("docker-ce-cli_"))!
    const deb4 = hrefs.findLast(item => item.startsWith("docker-buildx-plugin_"))!
    const deb5 = hrefs.findLast(item => item.startsWith("docker-compose-plugin_"))!

    const debs = [deb, deb2, deb3, deb4, deb5]

    const dir = await readdir(".")
    await Promise.all(
        debs
            .filter(deb => !dir.includes(deb))
            .map(deb => execAsync(`wget -q https://download.docker.com/linux/ubuntu/dists/${codename}/pool/stable/amd64/${deb}`)),
    )
    await execAsync(`dpkg -i ${debs.join(" ")}`)
    for (const deb of debs) await rm(deb, { force: true, recursive: true })

    type Answer = {
        addMirrors?: boolean
    }

    const { addMirrors } = await inquirer.prompt<Answer>([
        {
            type: "confirm",
            name: "addMirrors",
            message: "是否添加镜像地址",
            default: true,
        },
    ])
    if (!addMirrors) return
    setDockerRegistry()
}
