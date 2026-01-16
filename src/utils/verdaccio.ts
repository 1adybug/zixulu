import { mkdir, readdir, stat, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import consola from "consola"
import inquirer from "inquirer"
import { spawnAsync } from "soda-nodejs"

import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

const script = `import { spawnSync } from "child_process"
import { rmSync } from "fs"

spawnSync("docker compose down", { cwd: "verdaccio", shell: true, stdio: "inherit" })

spawnSync("rimraf verdaccio", { shell: true, stdio: "inherit" })

spawnSync("7z x verdaccio.zip", { shell: true, stdio: "inherit" })

spawnSync("docker compose up -d", { cwd: "verdaccio", shell: true, stdio: "inherit" })

spawnSync("rimraf verdaccio.zip", { shell: true, stdio: "inherit" })

rmSync(import.meta.filename)
`

export async function verdaccio() {
    const dir = await readdir(".")

    if (dir.includes(".verdaccio")) {
        consola.warn(".verdaccio 文件夹已存在")
        process.exit(1)
    }

    await mkdir(".verdaccio", { recursive: true })

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

    await spawnAsync(`7z a .verdaccio/verdaccio.zip ${verdaccioPath}`, { shell: true, stdio: "inherit" })

    await writeFile(join(".verdaccio", "verdaccio.mjs"), script, "utf-8")
}
