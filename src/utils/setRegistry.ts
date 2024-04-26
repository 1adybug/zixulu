import { PackageManager, Registry } from "src/constant"
import { spawnAsync } from "."

export async function setRegistry() {
    const { default: inquirer } = await import("inquirer")

    const { manager } = await inquirer.prompt({
        type: "list",
        name: "manager",
        message: "请选择包管理器",
        choices: Object.keys(PackageManager)
    })

    const { registry } = await inquirer.prompt({
        type: "list",
        name: "registry",
        message: "请选择要更换的源",
        choices: Object.keys(Registry)
    })

    const command = `${manager} config set registry ${Registry[registry as keyof typeof Registry]}`
    await spawnAsync(command)
}
