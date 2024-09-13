import { ProjectType } from "@constant/index"
import consola from "consola"
import { addAntd } from "./addAntd"
import { addDependency } from "./addDependency"
import { addGitignore } from "./addGitignore"
import { addPrettier } from "./addPrettier"
import { addPrisma } from "./addPrisma"
import { tailwind } from "./tailwind"
import { createBrowserlistrc } from "./createBrowserlistrc"
import { getPackageManager } from "./getPackageManager"
import { installDependceny } from "./installDependceny"
import { next } from "./next"
import { readPackageJson } from "./readPackageJson"
import { removeESLint } from "./removeESLint"
import { rsbuild } from "./rsbuild"
import { setTsConfig } from "./setTsConfig"
import { vite } from "./vite"
import { addZipDist } from "./addZipDist"

export async function initProject() {
    consola.start("开始初始化项目")
    const { default: inquirer } = await import("inquirer")
    await createBrowserlistrc()
    const packageJson = await readPackageJson()
    const allDependcies = Object.keys(packageJson.dependencies || {}).concat(Object.keys(packageJson.devDependencies || {}))
    if (!allDependcies.includes("react") || !allDependcies.includes("react-dom")) {
        consola.error("仅支持 React 项目")
        return
    }
    let type: ProjectType
    if (allDependcies.some(item => item === "next")) {
        type = ProjectType.next
    } else if (allDependcies.some(item => item === "@remix-run/react")) {
        type = ProjectType.remix
    } else if (allDependcies.some(item => item === "vite")) {
        type = ProjectType.vite
    } else if (allDependcies.some(item => item === "@rsbuild/core")) {
        type = ProjectType.rsbuild
    } else {
        consola.error("仅支持 Next、Remix、Vite、Rsbuild 项目")
        return
    }
    await addGitignore()
    await addDependency({
        package: ["@types/node"],
        type: "devDependencies"
    })
    const manager = await getPackageManager()
    if (allDependcies.some(item => item.includes("eslint"))) {
        const { removeEslintConfig } = await inquirer.prompt({
            type: "confirm",
            name: "removeEslintConfig",
            message: "是否删除 ESLint 配置文件",
            default: true
        })
        if (removeEslintConfig) await removeESLint()
    }
    const isFullStack = type === ProjectType.next || type === ProjectType.remix
    const choices = isFullStack
        ? ["antd", "ahooks", "dayjs", "deepsea-components", "deepsea-tools", "prisma", "tailwind", "zod", "stable-hash"]
        : ["antd", "ahooks", "dayjs", "deepsea-components", "deepsea-tools", "tailwind", "react-router-dom", "stable-hash"]

    const { modules } = await inquirer.prompt({
        type: "checkbox",
        name: "modules",
        message: "请选择要添加的模块",
        choices,
        default: choices
    })

    const added: string[] = []
    if (modules.includes("antd")) await addAntd()
    if (modules.includes("tailwind")) await tailwind()
    else await addPrettier()
    if (modules.includes("ahooks")) added.push("ahooks")
    if (modules.includes("dayjs")) added.push("dayjs")
    if (modules.includes("deepsea-components")) added.push("deepsea-components")
    if (modules.includes("deepsea-tools")) added.push("deepsea-tools")
    if (modules.includes("stable-hash")) added.push("stable-hash")
    if (modules.includes("zod")) added.push("zod")
    if (modules.includes("react-router-dom")) added.push("react-router-dom")
    if (modules.includes("stable-hash")) added.push("stable-hash")

    await addDependency({
        package: added,
        type: "dependencies"
    })

    switch (type) {
        case ProjectType.next:
            await next()
            break

        case ProjectType.remix:
            await vite()
            break

        case ProjectType.vite:
            await vite()
            break

        case ProjectType.rsbuild:
            await rsbuild()
            break
    }

    let installed = false
    if (modules.includes("prisma")) {
        await addPrisma(manager)
        installed = true
    }
    if (!installed) await installDependceny({ silent: true, manager })
    await setTsConfig("noEmit", true)
    consola.success("项目初始化完成")
}
