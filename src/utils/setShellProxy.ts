import { spawnAsync } from "."

export async function setShellProxy() {
    const { default: inquirer } = await import("inquirer")
    const { open } = await inquirer.prompt({
        type: "list",
        name: "open",
        message: "请选择",
        choices: [
            {
                name: "打开代理",
                value: true
            },
            {
                name: "关闭代理",
                value: false
            }
        ]
    })
    if (!open) return await spawnAsync(`netsh winhttp reset proxy`)
    const { proxy } = await inquirer.prompt({
        type: "input",
        name: "proxy",
        message: "请输入代理地址",
        default: "http://localhost:7890"
    })
    await spawnAsync(`netsh winhttp set proxy "${proxy}" "<local>"`)
}
