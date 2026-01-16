import { spawnAsync } from "soda-nodejs"

export interface PullDockerImageParams {
    image: string
    sha256?: string
}

export async function pullDockerImage({ image, sha256 }: PullDockerImageParams) {
    const match = image.match(/^(.+):(.+)$/)
    image = match ? match[1] : image
    const tag = match ? match[2] : "latest"
    sha256 = sha256?.replace(/^@?sha256:/, "")

    if (sha256) {
        await spawnAsync(`docker pull ${image}@sha256:${sha256}`)
        await spawnAsync(`docker tag ${image}@sha256:${sha256} ${image}:${tag}`)
    } else await spawnAsync(`docker pull ${image}:${tag}`)
}
