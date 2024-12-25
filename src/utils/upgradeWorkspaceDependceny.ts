import { readdir, stat } from "fs/promises"
import { join, resolve } from "path"
import { chdir } from "process"
import consola from "consola"

import { actionWithBackup } from "./actionWithBackup"
import { getUpgradeDependencyConfig } from "./getUpgradeDependencyConfig"
import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"
import { upgradeDependency } from "./upgradeDependency"

export async function upgradeWorkspaceDependceny() {
    const { dir, ...rest } = await getUpgradeDependencyConfig()
    const dir2 = resolve(dir)
    const packages = await readdir(dir2)
    const packages2: string[] = []

    for (const pkg of packages) {
        const stat2 = await stat(join(dir2, pkg))
        if (!stat2.isDirectory()) continue
        const dir3 = await readdir(join(dir2, pkg))
        if (dir3.includes("package.json")) packages2.push(pkg)
    }

    const setting = await readZixuluSetting()

    const { default: inquirer } = await import("inquirer")
    type PromptResult = {
        packages3: string[]
    }
    const { packages3 } = await inquirer.prompt<PromptResult>([
        {
            type: "checkbox",
            name: "packages3",
            message: "请选择要升级的包",
            choices: packages2,
            default: setting.upgradeWorkspaceDependcenyHistory?.[dir2],
        },
    ])

    setting.upgradeWorkspaceDependcenyHistory ??= {}
    setting.upgradeWorkspaceDependcenyHistory[dir2] = packages3

    await writeZixuluSetting(setting)

    for (const pkg of packages3) {
        consola.start(`开始升级 ${pkg} 的依赖`)
        chdir(join(dir2, pkg))
        await actionWithBackup(() =>
            upgradeDependency({
                dir: ".",
                ...rest,
            }),
        )()
    }
}
