import { getEnumKeys, getEnumValues } from "deepsea-tools"
import inquirer from "inquirer"
import { spawnAsync } from "soda-nodejs"

import { PackageManager, Registry } from "@/constant/index"

import { readBunConfig } from "./readBunConfig"
import { writeBunConfig } from "./writeBunConfig"

export async function setRegistry() {
    const { manager } = await inquirer.prompt({
        type: "list",
        name: "manager",
        message: "请选择包管理器",
        choices: getEnumValues(PackageManager),
    })

    const { registry } = await inquirer.prompt({
        type: "list",
        name: "registry",
        message: "请选择要更换的源",
        choices: getEnumKeys(Registry),
    })

    if (manager === PackageManager.bun) {
        const config = await readBunConfig()
        config.install ??= {}
        config.install.registry = "https://registry.npmmirror.com"
        await writeBunConfig(config)
        return
    }

    await spawnAsync(
        `${manager} config set registry ${Registry[registry as keyof typeof Registry]}`,
        { shell: true, stdio: "inherit" },
    )
}
