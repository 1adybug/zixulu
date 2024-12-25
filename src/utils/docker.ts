import { JSDOM } from "jsdom"
import { execAsync } from "soda-nodejs"

export async function docker() {
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
    await Promise.all(debs.map(deb => execAsync(`wget -q https://download.docker.com/linux/ubuntu/dists/${codename}/pool/stable/amd64/${deb}`)))
    await execAsync(`sudo dpkg -i ${debs.join(" ")}`)
}
