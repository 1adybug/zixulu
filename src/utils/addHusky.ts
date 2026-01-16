import { writeFile } from "node:fs/promises"

import consola from "consola"
import simpleGit from "simple-git"
import { spawnAsync } from "soda-nodejs"

import { AddDependenciesConfig, addDependency } from "./addDependency"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { shouldContinue } from "./shouldContinue"
import { writePackageJson } from "./writePackageJson"

/**
 * addHusky 参数
 */
export interface AddHuskyParams {
    /** 是否跳过用户交互确认 */
    skipConfirm?: boolean
}

/**
 * 添加 husky 及 lint-staged 配置
 */
export async function addHusky(params?: AddHuskyParams) {
    const options = params ?? {}

    const git = simpleGit()
    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
        consola.info("当前目录不是 git 仓库，跳过 husky 配置")
        return
    }

    if (!options.skipConfirm) {
        const shouldSetupHooks = await shouldContinue("是否配置 husky hooks，在每次 commit 前自动格式化修改的文件？")

        if (!shouldSetupHooks) {
            consola.info("已取消 husky 配置")
            return
        }
    } else consola.info("已根据外部指令跳过 husky 配置确认")

    consola.start("开始配置 husky")

    const huskyConfig: AddDependenciesConfig = {
        package: ["husky", "lint-staged"],
        type: "devDependencies",
    }

    await addDependency(huskyConfig)
    await installDependceny()

    try {
        consola.start("初始化 husky")
        await spawnAsync("bunx husky init")
        consola.success("husky 初始化成功")
    } catch (error) {
        consola.error("husky 初始化失败", error)
    }

    try {
        consola.start("配置 pre-commit hook")
        const preCommitHook = "npx lint-staged"
        await writeFile(".husky/pre-commit", preCommitHook, "utf-8")
        consola.success("pre-commit hook 配置成功")
    } catch (error) {
        consola.error("pre-commit hook 配置失败", error)
    }

    const packageJson = await readPackageJson()
    packageJson["lint-staged"] = {
        "**/*": "prettier --write --ignore-unknown",
    }
    await writePackageJson({ data: packageJson })
    consola.success("lint-staged 配置成功")

    consola.success("husky 配置完成")
}
