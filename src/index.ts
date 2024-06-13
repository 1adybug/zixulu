#!/usr/bin/env node

import { Command } from "commander"
import { resolve } from "path"
import { CommitType } from "./constant"
import { actionWithBackup, getCommitMessage, readPackageJsonSync } from "./utils"
import { addAntd } from "./utils/addAntd"
import { addGitignore } from "./utils/addGitignore"
import { addPrettier } from "./utils/addPrettier"
import { addPrisma } from "./utils/addPrisma"
import { addTailwind } from "./utils/addTailwind"
import { arrowToFunction } from "./utils/arrowToFunction"
import { betaVersion } from "./utils/betaVersion"
import { checkType } from "./utils/checkType"
import { downloadLatestSoftware } from "./utils/downloadLatestSoftware"
import { syncVscode } from "./utils/syncVscode"
import { downloadNpm } from "./utils/downloadNpm"
import { generatePrisma } from "./utils/generatePrisma"
import { initProject } from "./utils/initProject"
import { interfaceToType } from "./utils/interfaceToType"
import { killProcessByPort } from "./utils/killProcessByPort"
import { next } from "./utils/next"
import { reinstall } from "./utils/reinstall"
import { removeComment } from "./utils/removeComment"
import { removeESLint } from "./utils/removeESLint"
import { removeFileOrFolderFromGit } from "./utils/removeFileOrFolderFromGit"
import { rsbuild } from "./utils/rsbuild"
import { setFatherConfig } from "./utils/setFatherConfig"
import { setGitProxy } from "./utils/setGitProxy"
import { setRegistry } from "./utils/setRegistry"
import { setShellProxy } from "./utils/setShellProxy"
import { sortPackageJson } from "./utils/sortPackageJson"
import { upgradeDependency } from "./utils/upgradeDependcy"
import { vite } from "./utils/vite"

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

program.command("vscode").alias("vsc").description("同步 VS Code 配置").action(syncVscode)

program.command("kill-port").description("根据端口号杀死进程").argument("port", "端口号").action(killProcessByPort)

program.command("rm-git").argument("path", "要移除的文件或文件夹").action(removeFileOrFolderFromGit)

program.command("npm-download").alias("nd").description("下载 npm 包").argument("name", "包名").action(downloadNpm)

program
    .command("prisma")
    .description("添加 prisma 配置")
    .action(actionWithBackup(addPrisma, getCommitMessage(CommitType.feature, "添加 prisma 配置")))

program.command("prisma-generate").alias("pg").description("生成 prisma client").action(generatePrisma)

program
    .command("antd")
    .description("添加 antd 配置")
    .action(actionWithBackup(addAntd, getCommitMessage(CommitType.feature, "添加 antd 配置")))

program
    .command("init")
    .description("初始化项目")
    .action(actionWithBackup(initProject, getCommitMessage(CommitType.feature, "初始化项目")))

program.command("tsc").description("类型检查").action(checkType)

program.command("beta-version").alias("bv").description("设置版本号").action(betaVersion)

program.command("reinstall").alias("re").description("重新安装依赖").argument("name", "包名").action(reinstall)

program.parse()
