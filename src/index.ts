#!/usr/bin/env node

import { Argument, Command } from "commander"
import consola from "consola"
import { resolve } from "path"
import { Module, ModuleResolution, Target, addDependencies, addLatestDependencies, addPrettierConfig, getPackageUpgradeVersion, getVersionFromRequiredVersion, install, readPackageJson, removeComment, removeESLint, setTsConfig, sortArrayOrObject, tailwind, vite, writePackageJson } from "./utils"
import { exec, spawn } from "child_process"
import { readFileSync, writeFileSync } from "fs"

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
        const level = (await consola.prompt("请选择升级的级别", {
            type: "select",
            options: ["major", "minor", "patch"]
        })) as "major" | "minor" | "patch"
        const packageJson = readPackageJson()
        const upgrades: { package: string; oldVersion: string; newVersion: string; type: "dependencies" | "devDependencies"; strVersion: string }[] = []
        if (packageJson.dependencies) {
            const pkgs = Object.keys(packageJson.dependencies)
            for (let i = 0; i < pkgs.length; i++) {
                const pkg = pkgs[i]
                const rv = packageJson.dependencies[pkg]
                const s = rv.match(/^\D*/)![0]
                const cv = getVersionFromRequiredVersion(rv)
                const version = await getPackageUpgradeVersion(pkg, cv, level)
                if (!version) continue
                upgrades.push({ package: pkg, oldVersion: cv, newVersion: version, type: "dependencies", strVersion: `${s}${version}` })
            }
        }
        if (packageJson.devDependencies) {
            const pkgs = Object.keys(packageJson.devDependencies)
            for (let i = 0; i < pkgs.length; i++) {
                const pkg = pkgs[i]
                const rv = packageJson.devDependencies[pkg]
                const s = rv.match(/^\D*/)![0]
                const cv = getVersionFromRequiredVersion(rv)
                const version = await getPackageUpgradeVersion(pkg, cv, level)
                if (!version) continue
                upgrades.push({ package: pkg, oldVersion: cv, newVersion: version, type: "dependencies", strVersion: `${s}${version}` })
            }
        }

        const pkgs = (await consola.prompt("请选择要升级的包", {
            type: "multiselect",
            options: upgrades.map(upgrade => ({ label: `${upgrade.package} ${upgrade.oldVersion} => ${upgrade.newVersion}`, value: upgrade.package }))
        })) as unknown as string[]

        pkgs.forEach(pkg => {
            const upgrade = upgrades.find(upgrade => upgrade.package === pkg)!
            packageJson[upgrade.type][pkg] = upgrade.strVersion
        })

        writePackageJson(packageJson)
        install()
    })

enum Registry {
    npm = "https://registry.npmjs.org/",
    taobao = "https://registry.npmmirror.com/",
    tencent = "https://mirrors.cloud.tencent.com/npm/"
}

program
    .command("registry")
    .description("设置 npm registry")
    .action(async () => {
        const manager = await consola.prompt("请选择包管理器", {
            type: "select",
            options: ["npm", "yarn", "pnpm"]
        })
        const registry = await consola.prompt("请选择要更换的源", {
            type: "select",
            options: ["npm", "taobao", "tencent"]
        })
        const command = `${manager} config set registry ${Registry[registry as keyof typeof Registry]}`
        spawn(command, { shell: true, stdio: "inherit" })
    })

program
    .command("sort")
    .description("对 package.json 中的依赖进行排序")
    .action(() => {
        const packageJson = readPackageJson()
        packageJson.dependencies = sortArrayOrObject(packageJson.dependencies)
        packageJson.devDependencies = sortArrayOrObject(packageJson.devDependencies)
        packageJson.peerDependencies = sortArrayOrObject(packageJson.peerDependencies)
        writePackageJson(packageJson)
    })

program.parse()
