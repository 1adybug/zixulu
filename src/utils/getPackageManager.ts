import { PackageManager } from "@src/constant"
import { readdir, writeFile } from "fs/promises"
import { join } from "path"

/**
 * 获取包管理器
 */
export async function getPackageManager(dir = "."): Promise<PackageManager> {
    const dir2 = await readdir(dir)
    if (dir2.includes("yarn.lock")) return PackageManager.yarn
    if (dir2.includes("package-lock.json")) return PackageManager.npm
    if (dir2.includes("pnpm-lock.yaml")) return PackageManager.pnpm
    const { default: inquirer } = await import("inquirer")
    const { manager } = await inquirer.prompt<{ manager: PackageManager }>({
        type: "list",
        name: "manager",
        message: "请选择包管理器",
        choices: ["yarn", "npm", "pnpm"],
    })
    if (manager === "yarn") await writeFile(join(dir, "yarn.lock"), "")
    if (manager === "npm") await writeFile(join(dir, "package-lock.json"), "")
    if (manager === "pnpm") await writeFile(join(dir, "pnpm-lock.yaml"), "")
    return manager
}
