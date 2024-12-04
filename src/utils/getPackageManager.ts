import { readdir } from "fs/promises"
import { getEnumValues } from "deepsea-tools"

import { PackageManager } from "@src/constant"

declare global {
    var __ZIXULU_PACKAGE_MANAGER__: PackageManager | undefined
}

/**
 * 获取包管理器
 */
export async function getPackageManager(dir = "."): Promise<PackageManager> {
    if (globalThis.__ZIXULU_PACKAGE_MANAGER__) return globalThis.__ZIXULU_PACKAGE_MANAGER__
    const dir2 = await readdir(dir)
    if (dir2.includes("yarn.lock")) return PackageManager.yarn
    if (dir2.includes("package-lock.json")) return PackageManager.npm
    if (dir2.includes("pnpm-lock.yaml")) return PackageManager.pnpm
    if (dir2.includes("bun.lockb")) return PackageManager.bun
    const { default: inquirer } = await import("inquirer")
    const { manager } = await inquirer.prompt<{ manager: PackageManager }>({
        type: "list",
        name: "manager",
        message: "请选择包管理器",
        choices: getEnumValues(PackageManager),
    })
    globalThis.__ZIXULU_PACKAGE_MANAGER__ = manager
    return manager
}
