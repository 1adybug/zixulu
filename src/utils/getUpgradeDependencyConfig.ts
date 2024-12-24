import { DistinctQuestion } from "inquirer"

export type UpgradeType = "dependencies" | "devDependencies"
export type UpgradeLevel = "major" | "minor" | "patch"

export type UpgradeDependencyConfig = {
    dir: string
    types: UpgradeType[]
    level: UpgradeLevel
}

/**
 * 获取升级配置
 */
export async function getUpgradeDependencyConfig<T extends keyof UpgradeDependencyConfig = keyof UpgradeDependencyConfig>(
    ...keys: T[]
): Promise<Pick<UpgradeDependencyConfig, T> & Partial<Pick<UpgradeDependencyConfig, Exclude<keyof UpgradeDependencyConfig, T>>>> {
    const ks = keys.length === 0 ? ["dir", "types", "level"] : keys
    const { default: inquirer } = await import("inquirer")

    const questions: DistinctQuestion<UpgradeDependencyConfig>[] = []

    if (ks.includes("dir"))
        questions.push({
            type: "input",
            name: "dir",
            message: "请输入升级的目录",
            default: ".",
        })

    if (ks.includes("types"))
        questions.push({
            type: "checkbox",
            name: "types",
            message: "请选择要升级的依赖类型",
            choices: ["dependencies", "devDependencies"],
            default: ["dependencies", "devDependencies"],
        })

    if (ks.includes("level"))
        questions.push({
            type: "list",
            name: "level",
            message: "请选择升级的级别",
            choices: ["major", "minor", "patch"],
            default: "minor",
        })

    const config = await inquirer.prompt<UpgradeDependencyConfig>(questions)

    return config
}
