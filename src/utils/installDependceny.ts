import { spawnAsync } from "soda-nodejs"

import { PackageManager } from "@src/constant"

import { getPackageManager } from "@utils/getPackageManager"

export type InstallDependcenyConfig = {
    /**
     * 是否静默安装
     */
    silent?: boolean
    /**
     * 包管理器
     */
    manager?: PackageManager
    /**
     * 目录
     */
    dir?: string
}

export async function installDependceny(config?: InstallDependcenyConfig): Promise<boolean> {
    let { silent, manager, dir } = config ?? {}

    if (!silent) {
        const { default: inquirer } = await import("inquirer")

        const { install } = await inquirer.prompt({
            type: "confirm",
            name: "install",
            message: "安装依赖",
        })

        if (install === false) return false
    }

    manager ??= await getPackageManager(dir)

    await spawnAsync(
        `${manager} install${global.__ZIXULU_REGISTRY__ ? ` --registry ${global.__ZIXULU_REGISTRY__}` : ""}${manager !== PackageManager.bun && global.__ZIXULU_PROXY__ ? ` --proxy http://localhost:7890 --https-proxy http://localhost:7890` : ""}`,
        { shell: true, stdio: "inherit", cwd: dir },
    )

    return true
}
