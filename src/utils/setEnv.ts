import consola from "consola"
import { execAsync } from "soda-nodejs"

export async function setEnv(key: string, value?: string) {
    value = value?.trim() ?? ""

    // 检测操作系统类型
    const isWindows = process.platform === "win32"

    // Windows 系统
    if (isWindows)
        await execAsync(
            `[Environment]::SetEnvironmentVariable("${key}", "${value}", "User")`,
            { shell: "powershell" },
        )
    else {
        // Linux/Mac 系统修改配置文件
        // 对于 bash，添加到 ~/.bashrc
        // 对于 zsh，添加到 ~/.zshrc
        const shell = process.env.SHELL || "/bin/bash"
        const config = shell.includes("zsh") ? "~/.zshrc" : "~/.bashrc"

        await execAsync(`echo "export ${key}=${value}" >> ${config}`)
        await execAsync(`source ${config}`)
    }

    consola.success(value ? `${key} 已设置为 ${value}` : `${key} 已删除`)
}
