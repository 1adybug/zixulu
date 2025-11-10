import { readdir } from "fs/promises"

import { getEnumValues } from "deepsea-tools"
import inquirer from "inquirer"

import { PackageManager } from "@/constant"

declare global {
    var __ZIXULU_PACKAGE_MANAGER__: PackageManager | undefined
}

/**
 * 获取项目使用的包管理器
 * @param dir 项目目录，默认为当前目录
 * @returns 包管理器类型
 * @description
 * 1. 优先使用缓存的包管理器
 * 2. 通过锁文件判断使用的包管理器类型
 * 3. 如果无法判断，则提示用户选择
 */
export async function getPackageManager(dir = "."): Promise<PackageManager> {
    if (globalThis.__ZIXULU_PACKAGE_MANAGER__)
        return globalThis.__ZIXULU_PACKAGE_MANAGER__
    const dir2 = await readdir(dir)
    if (dir2.includes("yarn.lock")) return PackageManager.yarn
    if (dir2.includes("package-lock.json")) return PackageManager.npm
    if (dir2.includes("pnpm-lock.yaml")) return PackageManager.pnpm
    if (dir2.includes("bun.lockb") || dir2.includes("bun.lock"))
        return PackageManager.bun

    type PromptResult = {
        manager: PackageManager
    }

    const { manager } = await inquirer.prompt<PromptResult>({
        type: "list",
        name: "manager",
        message: "请选择包管理器",
        choices: getEnumValues(PackageManager),
    })
    globalThis.__ZIXULU_PACKAGE_MANAGER__ = manager
    return manager
}
