import { readdir, readFile } from "fs/promises"

import consola from "consola"
import { spawnAsync } from "soda-nodejs"
import yaml from "yaml"

export interface Container {
    container_name: string
    image: string
    restart: string
    ports: string[]
}

export interface DockerCompose {
    services: Record<string, Container>
}

export async function updateDockerCompose() {
    const dir = await readdir(".")
    const file = dir.find(item => item === "docker-compose.yml" || item === "docker-compose.yaml")
    if (!file) throw new Error("docker-compose.yml 或 docker-compose.yaml 文件不存在")
    const content = await readFile(file, "utf-8")
    const data = yaml.parse(content) as DockerCompose
    const images = Object.values(data.services).map(service => service.image) as string[]

    consola.start("开始更新镜像")

    for (const image of images) {
        await spawnAsync(`docker pull ${image}`, {
            shell: true,
            stdio: "inherit",
        })
    }

    consola.success("更新镜像完成")

    await spawnAsync("docker compose down", {
        shell: true,
        stdio: "inherit",
    })

    await spawnAsync("docker compose up -d", {
        shell: true,
        stdio: "inherit",
    })

    consola.success("启动容器完成")
}
