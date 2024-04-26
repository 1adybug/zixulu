import consola from "consola"
import { mkdir, readdir, rename, rm } from "fs/promises"
import { join } from "path"
import { exit } from "process"
import { execAsync, zipDir } from "."

export async function downloadNpm(name: string) {
    consola.start(`开始下载 ${name}`)
    const folder = `.${name}`
    const file = `${name}.zip`
    const dir = await readdir(".")
    if (dir.includes(folder)) {
        consola.warn("文件夹已存在")
        exit()
    }
    if (dir.includes(file)) {
        consola.warn("文件已存在")
        exit()
    }
    await mkdir(folder, { recursive: true })
    await execAsync(`npm init -y`, { cwd: folder })
    await execAsync(`npm install ${name}`, { cwd: folder })
    await mkdir(join(folder, "node_modules", name, "node_modules"))
    const dir1 = await readdir(join(folder, "node_modules"))
    for (const d of dir1) {
        if (d === name) continue
        if (d.startsWith(".")) {
            await rm(join(folder, "node_modules", d), { recursive: true })
            continue
        }
        await rename(join(folder, "node_modules", d), join(folder, "node_modules", name, "node_modules", d))
    }
    await zipDir(join(folder, "node_modules"), file)
    await rm(folder, { recursive: true })
    consola.success(`下载 ${name} 完成`)
}
