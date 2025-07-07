import consola from "consola"
import { spawnAsync } from "soda-nodejs"

export async function updateDockerImage(images: string[]) {
    if (images.length === 0) {
        consola.warn("没有提供镜像名称")
        return
    }

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
