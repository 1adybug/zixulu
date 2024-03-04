#!/usr/bin/env node

import { spawn } from "child_process"
import { Argument, Command } from "commander"
import consola from "consola"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { Manager, Registry } from "./constant"
import { Module, ModuleResolution, Target, addDependencies, addLatestDependencies, addPrettierConfig, getFiles, getPackageUpgradeVersion, getTypeInGenerics, getVersionFromRequiredVersion, install, readPackageJson, removeComment, removeESLint, setTsConfig, sortArrayOrObject, spawnShell, tailwind, vite, writePackageJson } from "./utils"

const program = new Command()

const pkg = readPackageJson(resolve(__dirname, "../"))

program.name("格数科技").version(pkg.version)

program.command("eslint").description("删除 ESLint 配置文件").action(removeESLint)

program
    .command("prettier")
    .description("添加 prettier 配置文件")
    .option("-t, --tailwind", "是否添加 tailwind 插件")
    .action(options => {
        const { tailwind } = options
        addPrettierConfig(tailwind)
    })

program.command("vite").description("删除 vite 模板中的某些配置").action(vite)

program.command("tailwind").description("添加 tailwind 配置文件").action(tailwind)

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
        setTsConfig("target", target)
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
        setTsConfig("module", module)
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
        setTsConfig("moduleResolution", moduleResolution)
    })

interface NpmPackage {
    name: string
    description: string
}

const packages: NpmPackage[] = [
    {
        name: "deepsea-tools",
        description: "格数工具库"
    },
    {
        name: "deepsea-components",
        description: "格数组件库"
    },
    {
        name: "react-soda",
        description: "简单的状态管理库"
    },
    {
        name: "type-request",
        description: "基于 TypeScript 和 fetch 的类型请求库"
    },
    {
        name: "use-abort-signal",
        description: "在 useEffect 中安全地取消 fetch 请求"
    },
    {
        name: "react-viewer-soda",
        description: "基于 viewerjs 的图片预览组件"
    },
    {
        name: "viewerjs-soda",
        description: "基于 viewerjs 的图片预览库"
    }
]

program
    .command("npm")
    .description("一键添加 npm 包")
    .action(async () => {
        const packageNames = (await consola.prompt("请选择需要安装的包", {
            type: "multiselect",
            options: packages.map(pkg => ({ label: pkg.name, value: pkg.name, hint: pkg.description }))
        })) as unknown as string[]
        const latest = await consola.prompt("是否安装最新版本", {
            type: "confirm",
            initial: true
        })
        const packageJson = readPackageJson()
        for (const pkg of packageNames) {
            await (latest ? addLatestDependencies : addDependencies)(packageJson, pkg)
        }
        writePackageJson(packageJson)
        install()
    })

program
    .command("father")
    .description("修改 father 项目配置")
    .action(async () => {
        let packageJson = readPackageJson()
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
        const gitignore = readFileSync(".gitignore", "utf-8")
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
        if (!gitignore.some(line => /^\/?dist$/.test(line))) gitignore.push("dist")
        if (!gitignore.some(line => /^\/?yarn\.lock$/.test(line))) gitignore.push("yarn.lock")
        if (!gitignore.some(line => /^\/?pnpm-lock\.yaml$/.test(line))) gitignore.push("pnpm-lock.yaml")
        if (!gitignore.some(line => /^\/?node_modules$/.test(line))) gitignore.push("node_modules")
        if (!gitignore.some(line => /^\/?package-lock\.json$/.test(line))) gitignore.push("package-lock.json")
        if (!gitignore.some(line => /^\/?yarn-error\.log$/.test(line))) gitignore.push("yarn-error.log")
        writePackageJson(packageJson)
        writeFileSync(".fatherrc.ts", fatherrcCode)
        writeFileSync(".gitignore", gitignore.join("\n"))
        setTsConfig("target", Target.ESNext)
    })

program
    .command("upgrade")
    .description("升级所有依赖")
    .action(async () => {
        const { default: inquirer } = await import("inquirer")

        const packageJson = readPackageJson()

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

        writePackageJson(packageJson)

        install()
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
            choices: Object.keys(Manager)
        })

        const { registry } = await inquirer.prompt({
            type: "list",
            name: "registry",
            message: "请选择要更换的源",
            choices: Object.keys(Registry)
        })

        const command = `${manager} config set registry ${Registry[registry as keyof typeof Registry]}`
        await spawnShell(command)
    })

program
    .command("sort")
    .description("对 package.json 中的依赖进行排序")
    .action(() => {
        const packageJson = readPackageJson()
        packageJson.dependencies = sortArrayOrObject(packageJson.dependencies)
        packageJson.devDependencies = sortArrayOrObject(packageJson.devDependencies)
        packageJson.peerDependencies = sortArrayOrObject(packageJson.peerDependencies)
        packageJson.peerDevDependencies = sortArrayOrObject(packageJson.peerDevDependencies)
        writePackageJson(packageJson)
    })

type Choice = {
    value: string
    short: string
    name: string
    checked: boolean
}

program
    .command("arrow")
    .description("将箭头函数组件转换为函数组件")
    .action(async () => {
        consola.warn("请在使用本功能前提交或备份代码")
        const { default: inquirer } = await import("inquirer")
        const files = getFiles("./src", (path, stats) => path.ext === ".tsx" && stats.isFile())
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
                const code = readFileSync(file, "utf-8")
                const newCode = code.replace(reg, match => {
                    if (match.includes("memo(") || match.includes("forwardRef(")) {
                        warnFiles.add(file)
                        return match
                    }
                    modifiedFiles.add(file)
                    const hasExport = match.startsWith("export ")
                    const name = match.match(/const (\w+?):/)![1]
                    const typeIndex = match.indexOf("FC<")
                    if (typeIndex > 0) {
                        const type = getTypeInGenerics(match, typeIndex + 2)
                        return `${hasExport ? "export " : ""}function ${name}(props: ${type}) {`
                    }
                    return `${hasExport ? "export " : ""}function ${name}() {`
                })
                writeFileSync(file, newCode, "utf-8")
            }
        } else {
            for (const file of files) {
                const code = readFileSync(file, "utf-8")
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

                const newCode = code.replace(reg, match => {
                    if (!indexs.includes(index.toString())) return match
                    const hasExport = match.startsWith("export ")
                    const name = match.match(/const (\w+?):/)![1]
                    const typeIndex = match.indexOf("FC<")
                    if (typeIndex > 0) {
                        const type = getTypeInGenerics(match, typeIndex + 2)
                        return `${hasExport ? "export " : ""}function ${name}(props: ${type}) {`
                    }
                    return `${hasExport ? "export " : ""}function ${name}() {`
                })

                console.log()

                writeFileSync(file, newCode, "utf-8")
            }
        }

        if (modifiedFiles.size > 0) consola.success(`以下文件中的箭头函数组件已经转换为函数组件：\n\n${Array.from(modifiedFiles).join("\n")}`)

        if (warnFiles.size > 0) consola.warn(`以下文件中存在 memo 或 forwardRef，请手动转换：\n\n${Array.from(warnFiles).join("\n")}`)

        consola.start("检查项目是否存在 TypeScript 错误")

        await spawnShell("npx tsc --noEmit")
    })

program
    .command("interface")
    .description("将 interface 转换为 type")
    .action(async () => {
        consola.warn("请在使用本功能前提交或备份代码")
        const { default: inquirer } = await import("inquirer")
        const files = getFiles("./src", (path, stats) => (path.ext === ".tsx" || path.ext === ".ts") && !path.base.endsWith(".d.ts") && stats.isFile())

        const { auto } = await inquirer.prompt({
            type: "confirm",
            name: "auto",
            message: "是否自动选择要转换的类型"
        })

        const withoutExtendsReg = /^ *?(export )?interface (\w+?) {$/gm
        const withExtendsReg = /^ *?(export )?interface (\w+?) extends .+? {$/gm
        const interfaceReg = /^ *?(export )?interface (\w+?) (extends .+? )?{$/gm
        const replaceReg = /interface (\w+?) {$/
        const warnFiles: Set<string> = new Set()
        const modifiedFiles: Set<string> = new Set()

        if (auto) {
            for (const file of files) {
                const code = readFileSync(file, "utf-8")
                if (withExtendsReg.test(code)) warnFiles.add(file)
                const newCode = code.replace(withoutExtendsReg, match => {
                    modifiedFiles.add(file)
                    return match.replace(replaceReg, "type $1 = {")
                })
                writeFileSync(file, newCode, "utf-8")
            }
            console.log()
        } else {
            for (const file of files) {
                const code = readFileSync(file, "utf-8")
                if (!interfaceReg.test(code)) continue
                consola.start(file)
                if (withExtendsReg.test(code)) warnFiles.add(file)
                const matches = code.match(withoutExtendsReg)
                if (!matches) {
                    console.log()
                    continue
                }
                const choices = Array.from(matches).reduce((prev: Choice[], match, index) => {
                    const short = match.match(/interface (\w+?) {/)![1]
                    const name = `◆ ${match}
     ◆ ${match.replace(replaceReg, "type $1 = {")}`
                    prev.push({ value: index.toString(), short, name, checked: true })
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
                    message: `total ${choices.length} interface${choices.length > 1 ? "s" : ""}`,
                    choices
                })

                let index = 0

                const newCode = code.replace(withoutExtendsReg, match => {
                    if (!indexs.includes(index.toString())) return match
                    return match.replace(replaceReg, "type $1 = {")
                })

                console.log()

                writeFileSync(file, newCode, "utf-8")
            }
        }

        if (modifiedFiles.size > 0) consola.success(`以下文件中的 interface 已经转换为 type：\n\n${Array.from(modifiedFiles).join("\n")}`)
        if (warnFiles.size > 0) consola.warn(`以下文件中存在 extends，请手动转换：\n\n${Array.from(warnFiles).join("\n")}`)

        consola.start("检查项目是否存在 TypeScript 错误")

        await spawnShell("npx tsc --noEmit")
    })

program.parse()
