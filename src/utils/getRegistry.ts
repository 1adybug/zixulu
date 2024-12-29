import { execAsync } from "soda-nodejs"
import { PackageManager } from "@src/constant"
import { getPackageManager } from "./getPackageManager"
import { readBunConfig } from "./readBunConfig"

/**
 * 获取当前包管理器使用的 registry 源地址
 * @returns registry URL
 * @description
 * 1. 优先使用缓存的 registry
 * 2. 如果使用 bun，尝试从 bun 配置中获取
 * 3. 否则通过命令行获取对应包管理器的 registry 配置
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
