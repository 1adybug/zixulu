#!/usr/bin/env node

import { exec, spawn } from "child_process"
import { Argument, Command } from "commander"
import consola from "consola"
import { mkdir, readdir, readFile, rename, rm, writeFile } from "fs/promises"
import { join, resolve } from "path"
import { PackageManager, Registry, Software } from "./constant"
import { addAntd, addDependencies, addDevDependencies, addGitignore, addPostCSSConfig, addPrettier, addPrisma, addTailwind, addTailwindConfig, addTailwindToCSS, createIndexHtml, downloadVscodeExts, execAsync, getFiles, getPackageManager, getPackageUpgradeVersion, getPidInfoFromPort, getProcessInfoFromPid, getTypeInGenerics, getVersionFromRequiredVersion, installDependcies, Module, ModuleResolution, readPackageJson, readPackageJsonSync, removeComment, removeESLint, setTsConfig, SoftwareDownloadMap, sortArrayOrObject, spawnAsync, splitExtendsType, Target, vite, writeInstallVscodeExtScript, writePackageJson, writeRsbuildConfig, zipDir } from "./utils"
import { cwd } from "process"

const program = new Command()

const pkg = readPackageJsonSync(resolve(__dirname, "../"))

program.name("格数科技").version(pkg.version)

program.command("eslint").description("删除 ESLint 配置文件").action(removeESLint)

program
    .command("prettier")
    .description("添加 prettier 配置文件")
    .action(async () => {
        await addPrettier()
        await installDependcies()
    })

program.command("vite").description("删除 vite 模板中的某些配置").action(vite)

program
    .command("tailwind")
    .description("添加 tailwind 配置文件")
    .action(async () => {
        await addTailwind()
        await installDependcies()
    })

program.command("remove-comment").description("删除所有注释").addArgument(new Argument("path")).action(removeComment)

program
    .command("ts-target")
    .description("设置 tsconfig 中 target 字段")
    .action(async () => {
        const target = await consola.prompt("Please choose a target", {
            type: "select",
            options: Object.values(Target),
            initial: Target.ESNext
        })
        await setTsConfig("target", target)
    })

program
    .command("ts-module")
    .description("设置 tsconfig 中 module 字段")
    .action(async () => {
        const module = await consola.prompt("Please choose a module", {
            type: "select",
            options: Object.values(Module),
            initial: Module.ESNext
        })
        await setTsConfig("module", module)
    })

program
    .command("ts-module-resolution")
    .alias("ts-mr")
    .description("设置 tsconfig 中 module 字段")
    .action(async () => {
        const moduleResolution = await consola.prompt("Please choose a module resolution", {
            type: "select",
            options: Object.values(ModuleResolution),
            initial: ModuleResolution.NodeNext
        })
        await setTsConfig("moduleResolution", moduleResolution)
    })

program
    .command("father-setting")
    .alias("fs")
    .description("修改 father 项目配置")
    .action(async () => {
        let packageJson = await readPackageJson()
        packageJson.publishConfig ??= {}
        packageJson.publishConfig.access = "public"
        packageJson.publishConfig.registry = "https://registry.npmjs.org/"
        packageJson.publishConfig = sortArrayOrObject(packageJson.publishConfig)
        packageJson.files ??= []
        if (!packageJson.files.includes("src")) packageJson.files.push("src")
        packageJson.files = sortArrayOrObject(packageJson.files)
        const dependencies = packageJson.dependencies
        const devDependencies = packageJson.devDependencies
        const peerDependencies = packageJson.peerDependencies
        if (packageJson.repository?.url && !packageJson.repository.url.startsWith("git+")) packageJson.repository.url = `git+${packageJson.repository.url}.git`
        packageJson.repository ??= {}
        packageJson.repository.type ??= "git"
        packageJson.repository.url ??= `git+https://github.com/1adybug/${packageJson.name}.git`
        if (!packageJson.types) {
            packageJson = Object.entries(packageJson).reduce((prev: Record<string, any>, [key, value]) => {
                prev[key] = value
                if (Object.hasOwn(packageJson, "module")) {
                    if (key === "module") prev.types = value.replace(/\.js$/, ".d.ts")
                } else if (Object.hasOwn(packageJson, "main")) {
                    if (key === "main") prev.types = value.replace(/\.js$/, ".d.ts")
                }
                return prev
            }, {})
        }
        packageJson.scripts ??= {}
        packageJson.scripts.prepublishOnly = "npx zixulu upgrade && father doctor && npm run build"
        delete packageJson.dependencies
        delete packageJson.devDependencies
        delete packageJson.peerDependencies
        packageJson.dependencies = sortArrayOrObject(dependencies)
        packageJson.devDependencies = sortArrayOrObject(devDependencies)
        packageJson.peerDependencies = sortArrayOrObject(peerDependencies)
        const fatherrcCode = `import { defineConfig } from "father"

export default defineConfig({
    esm: {},
    cjs: {},
    targets: {
        node: 18,
        chrome: 100
    },
    sourcemap: true
})
`
        await addGitignore()
        await writePackageJson(packageJson)
        await writeFile(".fatherrc.ts", fatherrcCode)
        await setTsConfig("target", Target.ESNext)
    })

program
    .command("upgrade-dependency")
    .alias("ud")
    .description("升级所有依赖")
    .action(async () => {
        const status = await execAsync("git status")

        if (status === "fatal: not a git repository (or any of the parent directories): .git") {
            consola.warn("请在使用本功能前备份代码")
        } else if (!status.includes("nothing to commit, working tree clean")) {
            consola.warn("请在使用本功能前提交代码")
            return
        }

        const { default: inquirer } = await import("inquirer")

        const packageJson = await readPackageJson()

        const { types } = await inquirer.prompt({
            type: "checkbox",
            name: "types",
            message: "请选择要升级的依赖类型",
            choices: ["dependencies", "devDependencies"].filter(type => !!packageJson[type])
        })

        const { level } = await inquirer.prompt({
            type: "list",
            name: "level",
            message: "请选择升级的级别",
            choices: ["major", "minor", "patch"]
        })

        for (const type of types) {
            const upgrades: { package: string; oldVersion: string; newVersion: string; strVersion: string }[] = []
            const allPkgs = Object.keys(packageJson[type])

            for (let i = 0; i < allPkgs.length; i++) {
                const pkg = allPkgs[i]
                const rv = packageJson[type][pkg]
                const s = rv.match(/^\D*/)![0]
                const cv = getVersionFromRequiredVersion(rv)
                const version = await getPackageUpgradeVersion(pkg, cv, level)
                if (!version) continue
                upgrades.push({ package: pkg, oldVersion: cv, newVersion: version, strVersion: `${s}${version}` })
            }

            if (upgrades.length === 0) continue

            const { pkgs } = await inquirer.prompt({
                type: "checkbox",
                name: "pkgs",
                message: "请选择要升级的包",
                choices: upgrades.map(upgrade => ({ name: `${upgrade.package} ${upgrade.oldVersion} => ${upgrade.newVersion}`, value: upgrade.package }))
            })

            pkgs.forEach((pkg: string) => {
                const upgrade = upgrades.find(upgrade => upgrade.package === pkg)!
                packageJson[type][pkg] = upgrade.strVersion
            })
        }

        await writePackageJson(packageJson)

        const status1 = await execAsync("git status")

        const reg = /modified: *package\.json/m

        if (reg.test(status1)) {
            consola.start("提交代码")
            await execAsync("git add package.json")
            await execAsync(`git commit -m "✨feature: upgrade dependencies"`)
            const result = await installDependcies()
            if (result) exec("npx tsc --noEmit")
        }
    })

program
    .command("registry")
    .description("设置 npm registry")
    .action(async () => {
        const { default: inquirer } = await import("inquirer")

        const { manager } = await inquirer.prompt({
            type: "list",
            name: "manager",
            message: "请选择包管理器",
            choices: Object.keys(PackageManager)
        })

        const { registry } = await inquirer.prompt({
            type: "list",
            name: "registry",
            message: "请选择要更换的源",
            choices: Object.keys(Registry)
        })

        const command = `${manager} config set registry ${Registry[registry as keyof typeof Registry]}`
        await spawnAsync(command)
    })

program
    .command("sort-package-json")
    .alias("spj")
    .description("对 package.json 中的依赖进行排序")
    .action(async () => {
        const packageJson = await readPackageJson()
        packageJson.dependencies = sortArrayOrObject(packageJson.dependencies)
        packageJson.devDependencies = sortArrayOrObject(packageJson.devDependencies)
        packageJson.peerDependencies = sortArrayOrObject(packageJson.peerDependencies)
        packageJson.peerDevDependencies = sortArrayOrObject(packageJson.peerDevDependencies)
        await writePackageJson(packageJson)
    })

type Choice = {
    value: string
    short: string
    name: string
    checked: boolean
}

program
    .command("arrow-to-function")
    .alias("a2f")
    .description("将箭头函数组件转换为函数组件")
    .action(async () => {
        consola.warn("请在使用本功能前提交或备份代码")
        const { default: inquirer } = await import("inquirer")
        const files = await getFiles({
            path: "./src",
            match: (path, stats) => path.ext === ".tsx" && stats.isFile()
        })
        const reg = /^(export )?const \w+?: FC.+?$/gm
        const { auto } = await inquirer.prompt({
            type: "confirm",
            name: "auto",
            message: "是否自动选择要转换的组件"
        })

        const warnFiles: Set<string> = new Set()
        const modifiedFiles: Set<string> = new Set()

        if (auto) {
            for (const file of files) {
                let code = await readFile(file, "utf-8")
                let exportDefaultReg: RegExp | undefined = undefined
                code = code.replace(reg, match => {
                    if (match.includes("memo(") || match.includes("forwardRef(")) {
                        warnFiles.add(file)
                        return match
                    }
                    modifiedFiles.add(file)
                    const hasExport = match.startsWith("export ")
                    const name = match.match(/const (\w+?):/)![1]
                    const edReg = new RegExp(`^export default ${name}$`, "m")
                    let hasExportDefault = false
                    if (!exportDefaultReg && !hasExport && edReg.test(code)) {
                        exportDefaultReg = edReg
                        hasExportDefault = true
                    }
                    const typeIndex = match.indexOf("FC<")
                    if (typeIndex > 0) {
                        const type = getTypeInGenerics(match, typeIndex + 2)
                        return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}(props: ${type}) {`
                    }
                    return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}() {`
                })
                if (exportDefaultReg) code = code.replace(exportDefaultReg, "")
                await writeFile(file, code, "utf-8")
            }
        } else {
            for (const file of files) {
                let code = await readFile(file, "utf-8")
                const matches = code.match(reg)
                if (!matches) continue
                consola.start(file)
                const choices = Array.from(matches).reduce((prev: Choice[], match, index) => {
                    if (match.includes("memo(") || match.includes("forwardRef(")) {
                        warnFiles.add(file)
                        return prev
                    }
                    modifiedFiles.add(file)
                    const hasExport = match.startsWith("export ")
                    const funName = match.match(/const (\w+?):/)![1]
                    const typeIndex = match.indexOf("FC<")
                    if (typeIndex > 0) {
                        const type = getTypeInGenerics(match, typeIndex + 2)
                        const name = `◆ ${match}
     ◆ ${hasExport ? "export " : ""}function ${funName}(props: ${type}) {`
                        prev.push({ value: index.toString(), short: funName, name, checked: true })
                    } else {
                        const name = `◆ ${match}
     ◆ ${hasExport ? "export " : ""}function ${funName}() {`
                        prev.push({ value: index.toString(), short: funName, name, checked: true })
                    }

                    return prev
                }, [])

                const length = choices.length.toString().length

                choices.forEach((choice, index) => {
                    let first = true
                    choice.name = choice.name.replace(/◆/g, () => {
                        if (first) {
                            first = false
                            return `◆ ${(index + 1).toString().padStart(length, "0")}.`
                        }
                        return "".padStart(length + 3, " ")
                    })
                })

                const { indexs } = await inquirer.prompt({
                    type: "checkbox",
                    name: "indexs",
                    message: `total ${choices.length} component${choices.length > 1 ? "s" : ""}`,
                    choices
                })

                let index = 0

                let exportDefaultReg: RegExp | undefined = undefined

                code = code.replace(reg, match => {
                    if (!indexs.includes(index.toString())) return match
                    const hasExport = match.startsWith("export ")
                    const name = match.match(/const (\w+?):/)![1]
                    const edReg = new RegExp(`^export default ${name}$`, "m")
                    let hasExportDefault = false
                    if (!exportDefaultReg && !hasExport && edReg.test(code)) {
                        exportDefaultReg = edReg
                        hasExportDefault = true
                    }
                    const typeIndex = match.indexOf("FC<")
                    if (typeIndex > 0) {
                        const type = getTypeInGenerics(match, typeIndex + 2)
                        return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}(props: ${type}) {`
                    }
                    return `${hasExport ? "export " : ""}${hasExportDefault ? "export default " : ""}function ${name}() {`
                })

                if (exportDefaultReg) code = code.replace(exportDefaultReg, "")

                console.log()

                await writeFile(file, code, "utf-8")
            }
        }

        if (modifiedFiles.size > 0) consola.success(`以下文件中的箭头函数组件已经转换为函数组件：\n\n${Array.from(modifiedFiles).join("\n")}`)

        if (warnFiles.size > 0) consola.warn(`以下文件中存在 memo 或 forwardRef，请手动转换：\n\n${Array.from(warnFiles).join("\n")}`)

        consola.start("格式化代码")

        await addPrettier()

        await installDependcies(true)

        await spawnAsync("npx prettier --write ./src")

        consola.start("检查项目是否存在 TypeScript 错误")

        await spawnAsync("npx tsc --noEmit")
    })

program
    .command("interface-to-type")
    .alias("i2t")
    .description("将 interface 转换为 type")
    .action(async () => {
        consola.warn("请在使用本功能前提交或备份代码")

        const files = await getFiles({
            match: (path, stats) => (path.ext === ".tsx" || path.ext === ".ts") && !path.base.endsWith(".d.ts") && stats.isFile(),
            exclude: (path, stats) => stats.isDirectory() && path.base === "node_modules"
        })

        const { default: inquirer } = await import("inquirer")

        const { ifContinue } = await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            message: "是否继续"
        })

        if (!ifContinue) return

        const reg = /(export )?interface (.+?) {/gm
        const reg1 = /\bexport\b/
        const reg2 = /(\w+?) extends (.+)/
        const modifiedFiles: Set<string> = new Set()

        for (const file of files) {
            const code = await readFile(file, "utf-8")
            const newCode = code.replace(reg, match => {
                modifiedFiles.add(file)
                const hasExport = reg1.test(match)
                const $2 = match.replace(reg, "$2")
                const matches = $2.match(reg2)
                if (matches) {
                    const name = matches[1]
                    const extendsTypes = splitExtendsType(matches[2]).join(" & ")

                    return `${hasExport ? "export " : ""}type ${name} = ${extendsTypes} & {`
                }
                return `${hasExport ? "export " : ""}type ${$2} = {`
            })
            await writeFile(file, newCode, "utf-8")
        }

        if (modifiedFiles.size > 0) consola.success(`以下文件中的 interface 已经转换为 type：\n\n${Array.from(modifiedFiles).join("\n")}`)

        consola.start("检查项目是否存在 TypeScript 错误")

        await spawnAsync("npx tsc --noEmit")
    })

program.command("gitignore").description("添加 .gitignore 文件").action(addGitignore)

program
    .command("rsbuild-setting")
    .alias("rs")
    .description("rsbuild 常用设置")
    .action(async () => {
        await writeRsbuildConfig()
        await createIndexHtml()
        await setTsConfig("noEmit", true)
        await addGitignore()
        await addDependencies("@ant-design/cssinjs")
        await addDependencies("@ant-design/icons")
        await addDependencies("@emotion/css")
        await addDependencies("ahooks")
        await addDependencies("antd")
        await addDependencies("deepsea-components")
        await addDependencies("deepsea-tools")
        await addDependencies("react-router-dom")
        await addDependencies("react-soda")
        await addDevDependencies("@types/node")
        await addDevDependencies("prettier")
        await addDevDependencies("prettier-plugin-tailwindcss")
        await addDevDependencies("tailwindcss")
        await addTailwindConfig()
        await addPostCSSConfig()
        await addTailwindToCSS()
        await addPrettier()
        await installDependcies()
    })

program
    .command("git-proxy")
    .alias("gp")
    .description("设置 git 代理")
    .action(async () => {
        const { default: inquirer } = await import("inquirer")
        const { global } = await inquirer.prompt({
            type: "list",
            name: "global",
            message: "请选择",
            choices: [
                {
                    name: "全局代理",
                    value: true
                },
                {
                    name: "当前项目",
                    value: false
                }
            ]
        })
        const { open } = await inquirer.prompt({
            type: "list",
            name: "open",
            message: "请选择",
            choices: [
                {
                    name: "打开代理",
                    value: true
                },
                {
                    name: "关闭代理",
                    value: false
                }
            ]
        })
        if (!open) {
            try {
                await spawnAsync(`git config${global ? " --global" : ""} --unset http.proxy`)
            } catch (error) {}
            try {
                await spawnAsync(`git config${global ? " --global" : ""} --unset https.proxy`)
            } catch (error) {}
            return
        }
        const { proxy } = await inquirer.prompt({
            type: "input",
            name: "proxy",
            message: "请输入代理地址",
            default: "http://localhost:7890"
        })
        await spawnAsync(`git config${global ? " --global" : ""} http.proxy ${proxy}`)
        await spawnAsync(`git config${global ? " --global" : ""} https.proxy ${proxy}`)
    })

program
    .command("shell-proxy")
    .alias("sp")
    .description("设置 powershell 代理")
    .action(async () => {
        const { default: inquirer } = await import("inquirer")
        const { open } = await inquirer.prompt({
            type: "list",
            name: "open",
            message: "请选择",
            choices: [
                {
                    name: "打开代理",
                    value: true
                },
                {
                    name: "关闭代理",
                    value: false
                }
            ]
        })
        if (!open) return await spawnAsync(`netsh winhttp reset proxy`)
        const { proxy } = await inquirer.prompt({
            type: "input",
            name: "proxy",
            message: "请输入代理地址",
            default: "http://localhost:7890"
        })
        await spawnAsync(`netsh winhttp set proxy "${proxy}" "<local>"`)
    })

program
    .command("download-software")
    .alias("ds")
    .description("下载最新版软件")
    .action(async () => {
        const { default: inquirer } = await import("inquirer")
        const dir = `softwares-${Date.now()}`
        const { softwares } = await inquirer.prompt({
            type: "checkbox",
            name: "softwares",
            message: "请选择要下载的软件",
            choices: Object.values(Software),
            default: Object.values(Software)
        })
        if (softwares.length === 0) return
        await mkdir(dir, { recursive: true })
        for (const software of softwares) {
            consola.start(`正在下载 ${software}`)
            await SoftwareDownloadMap[software as Software](dir)
        }
    })

program
    .command("download-vscode-extension")
    .alias("dve")
    .description("下载 VS Code 插件")
    .action(async () => {
        const dir = `vscode-${Date.now()}`
        await mkdir(dir, { recursive: true })
        await downloadVscodeExts(dir)
        await writeInstallVscodeExtScript(dir)
    })

program
    .command("port")
    .argument("port", "端口号")
    .action(async port => {
        const { default: inquirer } = await import("inquirer")
        const pidInfos = await getPidInfoFromPort(parseInt(port))
        const choices: { name: string; value: number }[] = []
        for (const { pid, info } of pidInfos) {
            const name = await getProcessInfoFromPid(pid)
            if (name) choices.push({ name: `${info} ${name}`, value: pid })
        }
        if (choices.length === 0) {
            consola.warn("没有找到对应的进程")
            return
        }
        const { chosenPids } = await inquirer.prompt({
            type: "checkbox",
            name: "chosenPids",
            message: "请选择要结束的进程",
            choices,
            default: choices.map(choice => choice.value)
        })
        for (const pid of chosenPids) {
            exec(`taskkill /f /pid ${pid}`)
        }
    })

program
    .command("rm-git")
    .argument("path")
    .option("-r, --recursive", "适用于文件夹")
    .action(async (path, options) => {
        await execAsync(`git filter-branch --force --index-filter "git rm${options.recursive ? " -r" : ""} --cached --ignore-unmatch ${path}" --prune-empty --tag-name-filter cat -- --all`)
    })

program
    .command("npm-download")
    .alias("nd")
    .argument("name")
    .action(async name => {
        const folder = `.${name}`
        const file = `${name}.zip`
        const dir = await readdir(".")
        if (dir.includes(folder)) {
            consola.warn("文件夹已存在")
            return
        }
        if (dir.includes(file)) {
            consola.warn("文件已存在")
            return
        }
        await mkdir(folder, { recursive: true })
        await execAsync(`npm init -y`, { cwd: folder })
        await execAsync(`npm install ${name}`, { cwd: folder })
        await mkdir(join(folder, "node_modules", name, "node_modules"))
        const dir1 = await readdir(join(folder, "node_modules"))
        for (const d of dir1) {
            if (d === name) continue
            if (d.startsWith(".")) {
                await rm(join(folder, "node_modules", d), { recursive: true })
                continue
            }
            await rename(join(folder, "node_modules", d), join(folder, "node_modules", name, "node_modules", d))
        }
        await zipDir(join(folder, "node_modules"), file)
        await rm(folder, { recursive: true })
    })

program.command("prisma").description("添加 prisma 配置").action(addPrisma)

program
    .command("prisma-generate")
    .alias("pg")
    .description("生成 prisma client")
    .action(async () => {
        await spawnAsync("npx prisma db push && npx prisma generate")
    })

program.command("antd").description("添加 antd 配置").action(addAntd)

program.command("create").action(async () => {
    spawn("yarn", ["create", "vite"], {
        stdio: "inherit",
        shell: true
    })
    // const { default: inquirer } = await import("inquirer")
    // const { type } = await inquirer.prompt({
    //     type: "list",
    //     name: "type",
    //     message: "",
    //     choices: ["next", "rsbuild", "vite", "remix"]
    // })
    // const manager = await getPackageManager()
    // const dir = await readdir("./")
    // switch (type) {
    //     case "next":
    //         await spawnAsync(`${manager === PackageManager.npm ? "npx" : manager} create next-app`, { cwd: cwd() })
    //         break
    //     case "rsbuild":
    //         await spawnAsync(`${manager === PackageManager.npm ? "npx" : manager} create rsbuild`, { cwd: cwd() })
    //         break
    //     case "vite":
    //         await spawnAsync(`${manager === PackageManager.npm ? "npx" : manager} create vite`, { cwd: cwd() })
    //         break
    //     case "remix":
    //         await spawnAsync(`${manager === PackageManager.npm ? "npx" : manager} create remix`, { cwd: cwd() })
    //         break
    // }
    // const dir1 = await readdir("./")
    // const dir2 = dir1.filter(d => !dir.includes(d))
    // let dir3: string
    // if (dir2.length === 0) {
    //     consola.error("未检测到新建的文件夹")
    //     return
    // }
    // if (dir2.length > 1) {
    //     const { dir: dir4 } = await inquirer.prompt({
    //         type: "list",
    //         name: "dir",
    //         message: "请选择",
    //         choices: dir2
    //     })
    //     dir3 = dir4
    // } else {
    //     dir3 = dir2[0]
    // }
    // process.chdir(dir3)
    // await installDependcies(true, manager)
    // const isFullStack = type === "next" || type === "remix"
    // const choices = isFullStack ? ["antd", "dayjs", "deepsea-components", "deepsea-tools", "prisma", "stable-hash", "tailwind", "zod"] : ["antd", "dayjs", "deepsea-components", "deepsea-tools", "stable-hash", "tailwind"]
    // const { modules } = await inquirer.prompt({
    //     type: "checkbox",
    //     name: "modules",
    //     message: "请选择",
    //     choices,
    //     default: choices
    // })
    // if (modules.includes("antd")) await addAntd()
    // if (modules.includes("tailwind")) await addTailwind()
    // if (modules.includes("prisma")) await addPrisma()
    // if (modules.includes("dayjs")) await addDependencies("dayjs")
    // if (modules.includes("deepsea-components")) await addDependencies("deepsea-components")
    // if (modules.includes("deepsea-tools")) await addDependencies("deepsea-tools")
    // if (modules.includes("stable-hash")) await addDependencies("stable-hash")
    // if (modules.includes("zod")) await addDependencies("zod")
    // await addPrettier()
    // await installDependcies(true, manager)
    // const packageJson = await readPackageJson()
    // if (Object.keys(packageJson.dependencies).some(item => item.includes("eslint")) || Object.keys(packageJson.devDependencies).some(item => item.includes("eslint"))) {
    //     const { removeEslintConfig } = await inquirer.prompt({
    //         type: "confirm",
    //         name: "removeEslintConfig",
    //         message: "是否删除 ESLint 配置文件",
    //         default: true
    //     })
    //     if (removeEslintConfig) await removeESLint()
    //     await installDependcies(true, manager)
    // }
})

program
    .command("tsc")
    .description("类型检查")
    .action(async () => await spawnAsync("npx tsc --noEmit"))

program.parse()
