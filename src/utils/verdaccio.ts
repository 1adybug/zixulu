import { mkdir, stat, writeFile } from "fs/promises"
import { join, parse, resolve } from "path"
import inquirer from "inquirer"
import { zip } from "soda-nodejs"

import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

const script = `import { spawnSync } from "child_process"

spawnSync("docker compose down", { cwd: "verdaccio", shell: true, stdio: "inherit" })

spawnSync("rimraf verdaccio", { shell: true, stdio: "inherit" })

spawnSync("7z x verdaccio.zip", { shell: true, stdio: "inherit" })

spawnSync("docker compose up -d", { cwd: "verdaccio", shell: true, stdio: "inherit" })
`

export async function verdaccio() {
    await mkdir("verdaccio", { recursive: true })

    const setting = await readZixuluSetting()

    interface Answer {
        verdaccioPath: string
    }

    let { verdaccioPath } = await inquirer.prompt<Answer>({
        type: "input",
        name: "verdaccioPath",
        message: "请输入 verdaccio 文件夹的位置",
        default: setting.verdaccioPath,
    })

    verdaccioPath = verdaccioPath.replace(/^"|"$/g, "")

    verdaccioPath = resolve(verdaccioPath)
    const stats = await stat(verdaccioPath)
    if (!stats.isDirectory()) throw new Error("verdaccio 文件夹不存在")

    setting.verdaccioPath = verdaccioPath
    await writeZixuluSetting(setting)

    const { base } = parse(verdaccioPath)

    await zip({
        input: verdaccioPath,
        output: join("verdaccio", `${base}.zip`),
    })

    await writeFile(join("verdaccio", "syncVerdaccio.mjs"), script, "utf-8")
}
