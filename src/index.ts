#!/usr/bin/env node

import { Command } from "commander"
import { resolve } from "path"
import { CommitType } from "./constant"
import { actionWithBackup, addAntd, addGitignore, addPrettier, addPrisma, addTailwind, arrowToFunction, downloadLatestSoftware, downloadLatestVscodeExtension, downloadNpm, getCommitMessage, initProject, interfaceToType, killProcessByPort, next, readPackageJsonSync, removeComment, removeESLint, removeFileOrFolderFromGit, rsbuild, setFatherConfig, setGitProxy, setRegistry, setShellProxy, sortPackageJson, spawnAsync, upgradeDependency, vite } from "./utils"

const program = new Command()

const pkg = readPackageJsonSync(resolve(__dirname, "../"))

program.name("格数科技").version(pkg.version)

program
    .command("eslint")
    .description("删除 ESLint 相关配置")
    .action(actionWithBackup(removeESLint, getCommitMessage(CommitType.feature, "删除 ESLint 相关配置")))

program
    .command("prettier")
    .description("添加 prettier 配置")
    .action(actionWithBackup(addPrettier, getCommitMessage(CommitType.feature, "添加 prettier 配置文件")))

program
    .command("vite")
    .description("初始化 vite 配置")
    .action(actionWithBackup(vite, getCommitMessage(CommitType.feature, "初始化 vite 配置")))

program
    .command("rsbuild")
    .description("初始化 rsbuild 配置")
    .action(actionWithBackup(rsbuild, getCommitMessage(CommitType.feature, "初始化 rsbuild 配置")))

program
    .command("next")
    .description("初始化 next 配置")
    .action(actionWithBackup(next, getCommitMessage(CommitType.feature, "初始化 next 配置")))

program
    .command("tailwind")
    .description("添加 tailwind 配置")
    .action(actionWithBackup(addTailwind, getCommitMessage(CommitType.feature, "添加 tailwind 配置")))

program
    .command("remove-comment")
    .description("删除文件注释")
    .argument("path", "文件路径")
    .action(actionWithBackup(removeComment, getCommitMessage(CommitType.feature, "删除文件注释")))

program
    .command("father")
    .alias("fs")
    .description("初始化 father 项目配置")
    .action(actionWithBackup(setFatherConfig, getCommitMessage(CommitType.feature, "初始化 father 项目配置")))

program.command("upgrade-dependency").alias("ud").description("升级项目依赖").action(actionWithBackup(upgradeDependency))

program.command("registry").description("设置 npm registry").action(setRegistry)

program
    .command("sort-package-json")
    .alias("spj")
    .description("对 package.json 中的依赖进行排序")
    .action(actionWithBackup(sortPackageJson, getCommitMessage(CommitType.feature, "对 package.json 中的依赖进行排序")))

program
    .command("arrow-to-function")
    .alias("a2f")
    .description("将箭头函数组件转换为函数组件")
    .action(actionWithBackup(arrowToFunction, getCommitMessage(CommitType.feature, "将箭头函数组件转换为函数组件")))

program
    .command("interface-to-type")
    .alias("i2t")
    .description("将 interface 转换为 type")
    .action(actionWithBackup(interfaceToType, getCommitMessage(CommitType.feature, "将 interface 转换为 type")))

program
    .command("gitignore")
    .description("添加 .gitignore 配置")
    .action(actionWithBackup(addGitignore, getCommitMessage(CommitType.feature, "添加 .gitignore 配置")))

program.command("git-proxy").alias("gp").description("设置 git 代理").action(setGitProxy)

program.command("shell-proxy").alias("sp").description("设置 Shell 代理").action(setShellProxy)

program.command("download-software").alias("ds").description("下载最新版软件").action(downloadLatestSoftware)

program.command("download-vscode-extension").alias("dve").description("下载 VS Code 插件").action(downloadLatestVscodeExtension)

program.command("kill-port").description("根据端口号杀死进程").argument("port", "端口号").action(killProcessByPort)

program.command("rm-git").argument("path", "要移除的文件或文件夹").option("-r, --recursive", "是否是文件夹").action(removeFileOrFolderFromGit)

program.command("npm-download").alias("nd").description("下载 npm 包").argument("name", "包名").action(downloadNpm)

program
    .command("prisma")
    .description("添加 prisma 配置")
    .action(actionWithBackup(addPrisma, getCommitMessage(CommitType.feature, "添加 prisma 配置")))

program
    .command("prisma-generate")
    .alias("pg")
    .description("生成 prisma client")
    .action(async () => {
        await spawnAsync("npx prisma db push && npx prisma generate")
    })

program
    .command("antd")
    .description("添加 antd 配置")
    .action(actionWithBackup(addAntd, getCommitMessage(CommitType.feature, "添加 antd 配置")))

program
    .command("init")
    .description("初始化项目")
    .action(actionWithBackup(initProject, getCommitMessage(CommitType.feature, "初始化项目")))

program
    .command("tsc")
    .description("类型检查")
    .action(async () => await spawnAsync("npx tsc --noEmit"))

program.parse()
