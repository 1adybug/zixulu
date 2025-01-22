import { existsSync } from "fs"
import { compress } from "soda-nodejs"

export interface TarParams {
    input: string
    output?: string
}

export async function tar({ input, output }: TarParams) {
    output = `${input}.tar.gz`
    if (existsSync(output)) {
        const { default: inquirer } = await import("inquirer")
        interface Answer {
            overwrite: boolean
        }
        const { overwrite } = await inquirer.prompt<Answer>({
            type: "confirm",
            name: "overwrite",
            message: "文件已存在，是否覆盖",
        })
        if (!overwrite) return
    }
    await compress({ input, output })
}
