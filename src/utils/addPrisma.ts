import { readdir, writeFile } from "fs/promises"

import consola from "consola"
import { spawnAsync } from "soda-nodejs"
import { PackageManager } from "src/constant"

import { addDependency } from "./addDependency"
import { installDependceny } from "./installDependceny"

const prismaFile = `import { PrismaClient } from "@prisma/client"

declare global {
    var __PRISMA__: PrismaClient
}

globalThis.__PRISMA__ ??= new PrismaClient()

export const prisma = globalThis.__PRISMA__
`

/**
 * 添加 Prisma 相关配置
 * 包括安装依赖、初始化配置等
 * @param manager 包管理器类型
 */
export async function addPrisma(manager?: PackageManager) {
    consola.start("开始添加 Prisma 配置")
    await addDependency({
        package: "@prisma/client",
    })
    await addDependency({
        package: ["prisma", "ts-node", "@types/node", "typescript"],
        type: "devDependencies",
    })
    const dir = await readdir(".")
    await installDependceny({ silent: true, manager })
    if (!dir.includes("tsconfig.json"))
        await spawnAsync("npx tsc --init", { shell: true, stdio: "inherit" })
    await spawnAsync("npx prisma init --datasource-provider sqlite", {
        shell: true,
        stdio: "inherit",
    })
    await writeFile("prisma/index.ts", prismaFile, "utf-8")
    consola.success("添加 Prisma 配置成功")
}
