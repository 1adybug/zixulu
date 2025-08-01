#!/usr/bin/env node
import { resolve } from "path"
import { Command } from "commander"
import consola from "consola"
import { emailReg } from "deepsea-tools"
import { setDefaultOptions } from "soda-nodejs"

import { CommitType } from "@constant/index"

import { addTailwind } from "@src/utils/addTailwind"

import { addAntd } from "@utils/addAntd"
import { addGitignore } from "@utils/addGitignore"
import { addFolderPathAlias, replacePathAlias } from "@utils/addPathAlias"
import { addPrettier } from "@utils/addPrettier"
import { addPrisma } from "@utils/addPrisma"
import { arrowToFunction } from "@utils/arrowToFunction"
import { betaVersion } from "@utils/betaVersion"
import { checkType } from "@utils/checkType"
import { code2Snippet } from "@utils/code2Snippet"
import { downloadLatestSoftware } from "@utils/downloadLatestSoftware"
import { downloadNpm } from "@utils/downloadNpm"
import { generatePrisma } from "@utils/generatePrisma"
import { initProject } from "@utils/initProject"
import { interfaceToType } from "@utils/interfaceToType"
import { killProcessByPort } from "@utils/killProcessByPort"
import { next } from "@utils/next"
import { pnpm } from "@utils/pnpm"
import { reinstall } from "@utils/reinstall"
import { removeComment } from "@utils/removeComment"
import { removeESLint } from "@utils/removeESLint"
import { removeFileOrFolderFromGit } from "@utils/removeFileOrFolderFromGit"
import { rollup } from "@utils/rollup"
import { rsbuild } from "@utils/rsbuild"
import { setFatherConfig } from "@utils/setFatherConfig"
import { setGitProxy } from "@utils/setGitProxy"
import { setRegistry } from "@utils/setRegistry"
import { setShellProxy } from "@utils/setShellProxy"
import { sortPackageJson } from "@utils/sortPackageJson"
import { syncVscode } from "@utils/syncVscode"
import { upgradeDependency } from "@utils/upgradeDependency"
import { vite } from "@utils/vite"

import { actionWithBackup } from "./utils/actionWithBackup"
import { addApi } from "./utils/addApi"
import { addBuildDocker } from "./utils/addBuildDocker"
import { addStartScript } from "./utils/addStartScript"
import { addSyncPackageScript } from "./utils/addSyncPackageScript"
import { addZipDist } from "./utils/addZipDist"
import { clearDockerImage } from "./utils/clearDockerImage"
import { clearDockerLog } from "./utils/clearDockerLog"
import { createBrowserlistrc } from "./utils/createBrowserlistrc"
import { getCommitMessage } from "./utils/getCommitMessage"
import { getHeaders } from "./utils/getHeaders"
import { initNode } from "./utils/initNode"
import { installDocker } from "./utils/installDocker"
import { json2type } from "./utils/json2type"
import { readPackageJsonSync } from "./utils/readPackageJsonSync"
import { removeLock } from "./utils/removeLock"
import { replaceAssets } from "./utils/replaceAssets"
import { CommitAuthor, replaceCommitAuthor } from "./utils/replaceCommitAuthor"
import { rslib } from "./utils/rslib"
import { serverToAction } from "./utils/serverToAction"
import { setBun } from "./utils/setBun"
import { setDockerRegistry } from "./utils/setDockerRegistry"
import { setEnv } from "./utils/setEnv"
import { setGlobalConfig } from "./utils/setGlobalConfig"
import { syncEditorSetting } from "./utils/syncEditorSetting"
import { tailwindPatch } from "./utils/tailwindPatch"
import { tar } from "./utils/tar"
import { test } from "./utils/test"
import { updateDockerImage } from "./utils/updateDockerImage"
import { upgradeRsbuild } from "./utils/upgradeRsbuild"
import { upgradeTailwind } from "./utils/upgradeTailwind"
import { upgradeWorkspaceDependceny } from "./utils/upgradeWorkspaceDependceny"
import { winget } from "./utils/winget"

setDefaultOptions({
    shell: true,
    stdio: "inherit",
})

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

program
    .command("upgrade-dependency")
    .alias("ud")
    .description("升级项目依赖")
    .option("-r, --registry <registry>", "npm 源地址，可以是 npm、taobao、tencent 或者自定义地址")
    .option("-p, --proxy", "是否使用代理")
    .action(async optios => {
        setGlobalConfig(optios)
        await actionWithBackup(() => upgradeDependency())()
    })

program
    .command("upgrade-workspace-dependency")
    .alias("uwd")
    .description("升级工作区项目依赖")
    .option("-r, --registry <registry>", "npm 源地址，可以是 npm、taobao、tencent 或者自定义地址")
    .option("-p, --proxy", "是否使用代理")
    .action(async options => {
        setGlobalConfig(options)
        await upgradeWorkspaceDependceny()
    })

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

program.command("gitignore").description("添加 .gitignore 配置").action(actionWithBackup(addGitignore))

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
    .action(actionWithBackup(() => addPrisma(), getCommitMessage(CommitType.feature, "添加 prisma 配置")))

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

program
    .command("reinstall")
    .alias("ri")
    .description("重新安装依赖")
    .option("-r, --registry <registry>", "npm 源地址，可以是 npm、taobao、tencent 或者自定义地址")
    .action(async options => {
        setGlobalConfig(options)
        reinstall()
    })

program.command("snippet").alias("sn").description("生成 vscode snippet").argument("path", "文件路径").action(code2Snippet)

program.command("add-alias").alias("aa").description("添加路径别名").action(actionWithBackup(addFolderPathAlias))

program.command("replace-alias").alias("ra").description("替换路径别名").action(actionWithBackup(replacePathAlias))

program.command("pnpm").description("设置 pnpm 配置").action(pnpm)

program.command("rollup").description("rollup 打包").action(rollup)

program.command("browserlistrc").alias("blr").description("添加 browserlistrc 配置").action(createBrowserlistrc)

program
    .command("asset")
    .description("替换文件中的资源地址")
    .argument("input", "静态文件夹路径")
    .option("-b, --base <base>", "资源地址 BaseUrl")
    .option("-o, --output <output>", "输出文件夹")
    .option("-p, --proxy", "是否使用代理")
    .action((input, { proxy, base, output }) => replaceAssets({ base, input, proxy, output }))

program
    .command("upgrade-rsbuild")
    .alias("ur")
    .description("升级 rsbuild")
    .option("-r, --registry <registry>", "npm 源地址，可以是 npm、taobao、tencent 或者自定义地址")
    .option("-p, --proxy", "是否使用代理")
    .action(async options => {
        setGlobalConfig(options)
        await actionWithBackup(() => upgradeRsbuild())()
    })

program
    .command("add-start-script")
    .alias("ass")
    .argument("type", "启动脚本类型：express、next")
    .option("-p, --port <port>", "端口地址")
    .option("-c, --core <core>", "实例数")
    .option("-h, --hostname <hostname>", "主机名")
    .option("-pem, --pemPath <pemPath>", "证书目录")
    .description("添加 express 启动脚本")
    .action(async (type, { port, core, pemPath }) => actionWithBackup(addStartScript)({ type, port, core, pemPath }))

program.command("headers").description("将浏览器中直接复制的 headers 转换为对象").action(getHeaders)

program
    .command("add-zip-dist")
    .alias("azd")
    .description("添加将 dist 压缩的脚本")
    .action(actionWithBackup(() => addZipDist({ install: true })))

program
    .command("upgrade-tailwind")
    .alias("ut")
    .description("升级 tailwind")
    .option("-r, --registry <registry>", "npm 源地址，可以是 npm、taobao、tencent 或者自定义地址")
    .option("-p, --proxy", "是否使用代理")
    .action(async options => {
        setGlobalConfig(options)
        await actionWithBackup(() => upgradeTailwind())()
    })

program.command("bun").description("设置 bun").action(setBun)

program.command("tailwind-patch").alias("tp").description("tailwind 补丁").action(tailwindPatch)

program
    .command("remove-lock")
    .alias("rl")
    .description("删除 lock 文件")
    .action(actionWithBackup(() => removeLock()))

program
    .command("rename-commit-author")
    .alias("rca")
    .description("重写 Git 提交历史的作者信息")
    .arguments("[infos...]")
    .action(async (infos: string[]) => {
        let prev: CommitAuthor | undefined
        let next: CommitAuthor | undefined
        infos = infos.slice(0, 2)
        function getUsernameAndEmail(info: string): CommitAuthor {
            const index = info.indexOf(":")
            if (index === -1) {
                if (emailReg.test(info)) return { email: info }
                return { name: info }
            }
            return {
                name: info.slice(0, index),
                email: info.slice(index + 1),
            }
        }
        if (infos.length === 0) throw new Error("请输入作者信息！")
        else if (infos.length === 1) next = getUsernameAndEmail(infos[0])
        else {
            prev = getUsernameAndEmail(infos[0])
            next = getUsernameAndEmail(infos[1])
        }
        await replaceCommitAuthor({ prev, next })
    })

program.command("install-docker").alias("id").description("安装 Docker").action(installDocker)

program.command("set-docker-registry").alias("sdr").description("设置 Docker 镜像地址").action(setDockerRegistry)

program
    .command("add-sync")
    .alias("asp")
    .option("-m, --monorepo", "是否是 monorepo")
    .description("添加同步包脚本")
    .action(actionWithBackup(addSyncPackageScript))

program
    .command("winget")
    .option("-p, --proxy", "是否使用代理")
    .description("使用 winget 更新软件")
    .action(async options => {
        setGlobalConfig(options)
        await winget()
    })

program
    .command("test")
    .description("这是一个测试命令，生产环境中使用，非开发人员请勿使用！")
    .action(async () => {
        consola.warn("这是一个测试命令，生产环境中使用，非开发人员请勿使用！")
        consola.warn("这是一个测试命令，生产环境中使用，非开发人员请勿使用！")
        consola.warn("这是一个测试命令，生产环境中使用，非开发人员请勿使用！")
        await test()
    })

program.command("sync-editor").alias("se").description("同步编辑器配置").action(syncEditorSetting)

program.command("server-to-action").alias("sta").description("将 server 文件夹下的文件转换为 action").action(serverToAction)

program
    .command("tar")
    .description("压缩文件")
    .argument("input", "输入文件夹")
    .option("-o, --output <output>", "输出文件")
    .action(async (input, { output }) => tar({ input, output }))

program
    .command("set-env")
    .description("设置环境变量")
    .argument("key", "环境变量 key")
    .argument("[value]", "环境变量 value")
    .action(async (key, value) => {
        await setEnv(key, value)
        consola.success("设置环境变量成功")
    })

program
    .command("add-api")
    .description("添加 api 文件")
    .argument("type", "api 类型")
    .option("-a, --api <api>", "api 文件夹路径")
    .option("-h, --hook <hook>", "hook 文件夹路径")
    .action(async (type, { api, hook }) => addApi({ type, api, hook }))

program.command("rslib").description("rslib 配置").action(rslib)

program.command("init-node").description("初始化 node 项目").action(initNode)

program.command("add-build-docker").alias("abd").description("添加构建 docker 镜像的脚本").action(addBuildDocker)

program.command("json2type").alias("j2t").argument("[path]", "json 文件路径").description("将 json 转换为 type").action(json2type)

program.command("clear-docker-image").alias("cdi").description("清除 docker 悬挂镜像").argument("[name]", "镜像名称").action(clearDockerImage)

program.command("clear-docker-log").alias("cdl").description("清除 docker 容器日志").argument("name", "容器名称或者 ID").action(clearDockerLog)

program.command("update-docker-image").alias("udi").description("更新 docker 镜像").arguments("<images...>").action(updateDockerImage)

program.parse()
