import { execAsync, spawnAsync } from "soda-nodejs"
import consola from "consola"

export async function clearDockerImage(name?: string) {
    name = name?.trim()
    const output = await execAsync(`docker images -f "dangling=true"${name ? ` -f "reference=*${name}*"` : ""}`)
    const outputs = output.split("\n").filter(Boolean)

    if (outputs.length === 1) {
        consola.warn("没有找到需要删除的镜像")
        return
    }

    const images = outputs.slice(1).map(item => item.match(/<none> +([0-9a-f]{12}) +/)![1])
    const { default: inquirer } = await import("inquirer")

    interface Answer {
        images: string[]
    }

    const { images: images2 } = await inquirer.prompt<Answer>({
        type: "checkbox",
        name: "images",
        message: "选择要删除的镜像",
        default: true,
        choices: outputs.map((item, index) => ({
            name: item,
            value: index === 0 ? "" : images[index - 1],
            disabled: index === 0,
        })),
    })

    for (let i = 0; i < images2.length; i++) {
        const image = images2[i]

        try {
            consola.ready(`正在删除 ${image}`)
            await spawnAsync(`docker rmi ${image}`, {
                shell: true,
                stdio: "inherit",
            })
            consola.success(`删除 ${image} 成功`)
        } catch (error) {
            consola.error(`删除 ${image} 失败`)
            if (i === images2.length - 1) break
            interface Answer2 {
                next: boolean
            }
            const { next } = await inquirer.prompt<Answer2>({
                type: "confirm",
                name: "next",
                message: "是否继续删除下一个镜像",
                default: true,
            })
            if (!next) break
        }
    }
}
