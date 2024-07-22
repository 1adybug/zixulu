import { readdir } from "fs/promises"
import { join } from "path"
import { getUpgradeDependencyConfig } from "./getUpgradeDependencyConfig"
import { upgradeDependency } from "./upgradeDependency"
import consola from "consola"

export async function upgradeWorkspaceDependceny(dir: string) {
    const config = await getUpgradeDependencyConfig("level", "types")
    const packages = await readdir(dir)
    for (const pkg of packages) {
        consola.start(`开始升级 ${pkg} 的依赖`)
        await upgradeDependency({
            dir: join(dir, pkg),
            ...config
        })
    }
}
