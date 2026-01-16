import { readdir, readFile } from "fs/promises"

import consola from "consola"
import fetch from "node-fetch"
import { spawnAsync } from "soda-nodejs"
import yaml from "yaml"

import { agent } from "@/constant"

import { pullDockerImage } from "./pullDockerImage"

export interface Container {
    container_name: string
    image: string
    restart: string
    ports: string[]
}

export interface DockerCompose {
    services: Record<string, Container>
}

export interface DockerImageDto {
    creator: number
    id: number
    images: DockerImageInfo[]
    last_updated: string
    last_updater: number
    last_updater_username: string
    name: string
    repository: number
    full_size: number
    v2: boolean
    tag_status: string
    tag_last_pulled: string
    tag_last_pushed: string
    media_type: string
    content_type: string
    digest: string
}

export interface DockerImageInfo {
    architecture: string
    features: string
    variant?: string
    digest: string
    os: string
    os_features: string
    os_version?: string
    size: number
    status: string
    last_pulled: string
    last_pushed: string
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
        const match = image.match(/^(.+):(.+)$/)
        const name = match ? match[1] : image
        const tag = match ? match[2] : "latest"
        const response = await fetch(`https://hub.docker.com/v2/repositories/${name}/tags/${tag}`, { agent })
        const data = (await response.json()) as DockerImageDto
        const sha256 = data.digest
        await pullDockerImage({ image, sha256 })
        consola.info(`更新镜像 ${image} 完成`)
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
