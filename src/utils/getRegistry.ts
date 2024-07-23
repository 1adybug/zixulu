import { PackageManager } from "@src/constant"
import { execAsync } from "soda-nodejs"
import { getPackageManager } from "./getPackageManager"

/**
 * 获取包管理器的源
 */
export async function getRegistry() {
    const packageManager = await getPackageManager()
    const registry = await execAsync(`${packageManager === PackageManager.yarn || packageManager === PackageManager.pnpm ? packageManager : "npm"} config get registry`)
    return registry
}
