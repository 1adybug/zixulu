import { PackageManager } from "@src/constant"
import { execAsync } from "soda-nodejs"
import { getPackageManager } from "./getPackageManager"
import { readBunConfig } from "./readBunConfig"

/**
 * 获取包管理器的源
 */
export async function getRegistry() {
    if (global.__ZIXULU_REGISTRY__) return global.__ZIXULU_REGISTRY__
    const packageManager = await getPackageManager()
    if (packageManager === PackageManager.bun) {
        const config = await readBunConfig()
        if (config.install?.registry) return config.install.registry
    }
    const registry = await execAsync(
        `${packageManager === PackageManager.yarn || packageManager === PackageManager.pnpm ? packageManager : "npm"} config get registry`,
    )
    return registry
}
