import { mkdir, readdir, writeFile } from "fs/promises"
import { JSDOM } from "jsdom"
import { execAsync } from "soda-nodejs"

export async function docker() {
    const isRoot = !!process.env.SUDO_USER
    if (!isRoot) throw new Error("请使用 root 用户执行命令")
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
    await mkdir("/etc/docker", { recursive: true })
    const daemon = {
        "registry-mirrors": ["https://docker.sunzishaokao.com", "https://hub.hxui.site", "https://docker.1ms.run"],
        "exec-opts": ["native.cgroupdriver=systemd"],
    }
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
    daemon["registry-mirrors"].push(...mirrors.split(/,，/))
    await writeFile("/etc/docker/daemon.json", JSON.stringify(daemon, null, 4))
    await execAsync("systemctl daemon-reload")
    await execAsync("systemctl restart docker")
}
