import inquirer from "inquirer"
import { spawnAsync } from "soda-nodejs"

export async function setGitProxy() {
    const { global } = await inquirer.prompt({
        type: "list",
        name: "global",
        message: "请选择",
        choices: [
            {
                name: "全局代理",
                value: true,
            },
            {
                name: "当前项目",
                value: false,
            },
        ],
    })
    const { open } = await inquirer.prompt({
        type: "list",
        name: "open",
        message: "请选择",
        choices: [
            {
                name: "打开代理",
                value: true,
            },
            {
                name: "关闭代理",
                value: false,
            },
        ],
    })

    if (!open) {
        try {
            await spawnAsync(`git config${global ? " --global" : ""} --unset http.proxy`, { shell: true, stdio: "inherit" })
        } catch {
            /* empty */
        }

        try {
            await spawnAsync(`git config${global ? " --global" : ""} --unset https.proxy`, { shell: true, stdio: "inherit" })
        } catch {
            /* empty */
        }

        return
    }

    const { proxy } = await inquirer.prompt({
        type: "input",
        name: "proxy",
        message: "请输入代理地址",
        default: "http://localhost:7890",
    })
    await spawnAsync(`git config${global ? " --global" : ""} http.proxy ${proxy}`, { shell: true, stdio: "inherit" })
    await spawnAsync(`git config${global ? " --global" : ""} https.proxy ${proxy}`, { shell: true, stdio: "inherit" })
}
