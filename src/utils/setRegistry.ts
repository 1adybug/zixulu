import { PackageManager, Registry } from "@constant/index"
import { getEnumKeys, getEnumValues } from "deepsea-tools"
import { spawnAsync } from "soda-nodejs"

export async function setRegistry() {
    const { default: inquirer } = await import("inquirer")

    let { manager } = await inquirer.prompt({
        type: "list",
        name: "manager",
        message: "请选择包管理器",
        choices: getEnumValues(PackageManager),
    })

    if (manager === PackageManager.bun) manager = PackageManager.npm

    const { registry } = await inquirer.prompt({
        type: "list",
        name: "registry",
        message: "请选择要更换的源",
        choices: getEnumKeys(Registry),
    })

    await spawnAsync(`${manager} config set registry ${Registry[registry as keyof typeof Registry]}`, { shell: true, stdio: "inherit" })
}
