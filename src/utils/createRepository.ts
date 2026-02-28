import { basename } from "node:path"

import consola from "consola"
import inquirer from "inquirer"
import { execAsync, spawnAsync } from "soda-nodejs"

import { isRepository } from "./isRepository"
import { readPackageJson } from "./readPackageJson"

/** 仓库可见性 */
export const RepositoryVisibility = {
    private: "private",
    public: "public",
} as const

export type RepositoryVisibility = (typeof RepositoryVisibility)[keyof typeof RepositoryVisibility]

/** package.json 内容 */
export interface PackageJson {
    /** 项目名称 */
    name?: string
}

/** 仓库类型选择结果 */
export interface SelectRepositoryVisibilityAnswer {
    /** 仓库可见性 */
    repositoryVisibility: RepositoryVisibility
}

/** 仓库名称确认结果 */
export interface ConfirmRepositoryNameAnswer {
    /** 仓库名称 */
    repositoryName: string
}

function getRootFolderName() {
    return basename(process.cwd())
}

function ensureRepositoryName(name: string) {
    if (!name.trim()) throw new Error("仓库名称不能为空")

    return name.trim()
}

async function getDefaultRepositoryName() {
    try {
        const packageJson = (await readPackageJson()) as PackageJson

        if (packageJson.name?.trim()) return packageJson.name.trim()
    } catch {}

    return getRootFolderName()
}

async function getRepositoryBranchName() {
    try {
        await execAsync("git rev-parse --verify main")
        return "main"
    } catch {}

    try {
        await execAsync("git rev-parse --verify master")
        return "master"
    } catch {
        throw new Error("当前仓库不存在 main 或 master 分支")
    }
}

export async function createRepository() {
    if (!(await isRepository())) throw new Error("当前目录不是 Git 仓库")

    const defaultRepositoryName = await getDefaultRepositoryName()

    const { repositoryName } = await inquirer.prompt<ConfirmRepositoryNameAnswer>({
        type: "input",
        name: "repositoryName",
        message: "请输入仓库名称",
        default: defaultRepositoryName,
    })

    const finalRepositoryName = ensureRepositoryName(repositoryName)

    const { repositoryVisibility } = await inquirer.prompt<SelectRepositoryVisibilityAnswer>({
        type: "select",
        name: "repositoryVisibility",
        message: "请选择仓库类型",
        choices: [
            {
                name: RepositoryVisibility.private,
                value: RepositoryVisibility.private,
            },
            {
                name: RepositoryVisibility.public,
                value: RepositoryVisibility.public,
            },
        ],
        default: RepositoryVisibility.private,
    })

    const branchName = await getRepositoryBranchName()

    consola.start(`开始创建 GitHub 仓库：${finalRepositoryName}`)
    await spawnAsync(`gh repo create ${finalRepositoryName} --${repositoryVisibility} --source=. --remote=origin`, {
        shell: true,
        stdio: "inherit",
    })

    consola.start("开始设置默认远程仓库")
    await spawnAsync("gh repo set-default origin", {
        shell: true,
        stdio: "inherit",
    })

    consola.start(`开始推送本地 ${branchName} 分支到远程 ${branchName} 分支`)
    await spawnAsync(`git push --set-upstream origin ${branchName}:${branchName}`, {
        shell: true,
        stdio: "inherit",
    })
    consola.success(`创建 GitHub 仓库成功：${finalRepositoryName}`)
}
