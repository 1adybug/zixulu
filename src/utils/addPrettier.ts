import { writeFile } from "node:fs/promises"

import consola from "consola"
import simpleGit from "simple-git"

import { AddDependenciesConfig, addDependency } from "./addDependency"
import { addHusky } from "./addHusky"
import { addRuleToPrettierIgnore } from "./addRuleToPrettierIgnore"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { shouldContinue } from "./shouldContinue"
import { writePackageJson } from "./writePackageJson"

const prettierIgnoreRules = ["node_modules", "public", "dist", "build", "generated", ".next", ".vscode", ".generated", ".agent", ".cursor", "AGENTS.md"]

const prettierConfig = `// @ts-check

/**
 * @type {import("@1adybug/prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    endOfLine: "lf",
    printWidth: 160,
    plugins: ["@1adybug/prettier"],
    controlStatementBraces: "add",
    multiLineBraces: "add",
    nodeProtocol: "add",
}

export default config
`

/**
 * prettier 配置生成器参数
 */
export interface GetPluginConfigParams {
    /** 是否使用 tailwind */
    isTailwind: boolean
    /** 是否是 react 项目 */
    isReact: boolean
}

/**
 * 添加 prettier 相关配置
 * 包括安装依赖、创建配置文件等
 */
export async function addPrettier() {
    consola.start("开始添加 prettier 配置")
    await writeFile("prettier.config.mjs", prettierConfig, "utf-8")
    await addRuleToPrettierIgnore(...prettierIgnoreRules)

    const config2: AddDependenciesConfig = {
        package: ["prettier", "@1adybug/prettier"],
        type: "devDependencies",
    }

    await addDependency(config2)
    const packageJson2 = await readPackageJson()
    packageJson2.scripts ??= {}
    packageJson2.scripts.format = "prettier --write ."
    packageJson2.scripts.fg = 'npm run format && git add . && git commit -m "✨feature: format"'
    await writePackageJson({ data: packageJson2 })
    await installDependceny()

    const git = simpleGit()
    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
        consola.info("当前目录不是 git 仓库，跳过 git hooks 配置")
        consola.success("添加 prettier 配置成功")
        return
    }

    consola.info("检测到 git 仓库")
    const shouldSetupHooks = await shouldContinue("是否配置 git hooks，在每次 commit 前自动格式化修改的文件？")

    if (!shouldSetupHooks) {
        consola.info("跳过 git hooks 配置")
        consola.success("添加 prettier 配置成功")
        return
    }

    await addHusky({ skipConfirm: true })

    consola.success("添加 prettier 配置成功")
}
