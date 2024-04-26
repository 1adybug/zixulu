import consola from "consola"
import { readdir } from "fs/promises"
import { PackageManager } from "src/constant"
import { addDependencies, addDevDependencies, installDependcies, spawnAsync } from "."

export async function addPrisma(manager?: PackageManager) {
    consola.start("开始添加 Prisma 配置")
    await addDependencies("@prisma/client")
    await addDevDependencies("prisma")
    await addDevDependencies("ts-node")
    await addDevDependencies("@types/node")
    await addDevDependencies("typescript")
    const dir = await readdir("./")
    await installDependcies(true, manager)
    if (!dir.includes("tsconfig.json")) await spawnAsync("npx tsc --init")
    await spawnAsync("npx prisma init --datasource-provider sqlite")
    consola.success("添加 Prisma 配置成功")
}
