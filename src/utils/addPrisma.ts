import consola from "consola"
import { readdir } from "fs/promises"
import { spawnAsync } from "soda-nodejs"
import { PackageManager } from "src/constant"
import { addDependencies, addDevDependencies } from "."
import { installDependceny } from "./installDependceny"

export async function addPrisma(manager?: PackageManager) {
    consola.start("开始添加 Prisma 配置")
    await addDependencies("@prisma/client")
    await addDevDependencies("prisma", "ts-node", "@types/node", "typescript")
    const dir = await readdir(".")
    await installDependceny({ silent: true, manager })
    if (!dir.includes("tsconfig.json")) await spawnAsync("npx tsc --init", { shell: true, stdio: "inherit" })
    await spawnAsync("npx prisma init --datasource-provider sqlite", { shell: true, stdio: "inherit" })
    consola.success("添加 Prisma 配置成功")
}
