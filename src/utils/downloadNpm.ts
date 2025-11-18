import { mkdir, readdir, rename, rm } from "fs/promises"
import { join } from "path"

import consola from "consola"
import { execAsync, zip } from "soda-nodejs"

import { getPackageVersionInDependcy } from "./getPackageVersionInDependcy"

/**
 * 下载 NPM 包并打包成 zip
 * @param name NPM 包名
 * @throws {Error} 如果目标文件夹已存在
 */
export async function downloadNpm(name: string) {
    consola.start(`开始下载 ${name}`)
    const folder = `${name}-cache`
    const dir = await readdir(".")

    if (dir.includes(folder)) {
        consola.warn("文件夹已存在")
        throw new Error("文件夹已存在")
    }

    await mkdir(folder, { recursive: true })
    await execAsync(`npm init -y`, { cwd: folder })
    await execAsync(`npm install ${name}`, { cwd: folder })
    const version = await getPackageVersionInDependcy(name, folder)
    const file = `${name}@${version}.zip`
    await mkdir(join(folder, "node_modules", name, "node_modules"))
    const dir2 = await readdir(join(folder, "node_modules"))

    for (const item of dir2) {
        if (item === name) continue

        if (item.startsWith(".")) {
            await rm(join(folder, "node_modules", item), { recursive: true })
            continue
        }

        await rename(join(folder, "node_modules", item), join(folder, "node_modules", name, "node_modules", item))
    }

    await zip({
        input: name,
        output: file,
        cwd: join(folder, "node_modules"),
    })
    await rename(join(folder, "node_modules", file), join(file))
    await rm(folder, { recursive: true })
    consola.success(`下载 ${name} 完成`)
}
