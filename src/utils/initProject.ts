import consola from "consola"
import { ProjectType } from "../../src/constant"
import { addDependencies, getPackageManager, installDependcies, readPackageJson, setTsConfig } from "."
import { addAntd } from "./addAntd"
import { addGitignore } from "./addGitignore"
import { addPrettier } from "./addPrettier"
import { addPrisma } from "./addPrisma"
import { addTailwind } from "./addTailwind"
import { next } from "./next"
import { removeESLint } from "./removeESLint"
import { rsbuild } from "./rsbuild"
import { vite } from "./vite"

export async function initProject() {
    consola.start("开始初始化项目")
    const { default: inquirer } = await import("inquirer")
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
    const choices = isFullStack ? ["antd", "dayjs", "deepsea-components", "deepsea-tools", "prisma", "stable-hash", "tailwind", "zod"] : ["antd", "dayjs", "deepsea-components", "deepsea-tools", "stable-hash", "tailwind"]
    const { modules } = await inquirer.prompt({
        type: "checkbox",
        name: "modules",
        message: "请选择要添加的模块",
        choices,
        default: choices
    })
    if (modules.includes("antd")) await addAntd()
    if (modules.includes("tailwind")) await addTailwind()
    if (modules.includes("dayjs")) await addDependencies("dayjs")
    if (modules.includes("deepsea-components")) await addDependencies("deepsea-components")
    if (modules.includes("deepsea-tools")) await addDependencies("deepsea-tools")
    if (modules.includes("stable-hash")) await addDependencies("stable-hash")
    if (modules.includes("zod")) await addDependencies("zod")
    await addPrettier()
    let installed = false
    if (modules.includes("prisma")) {
        await addPrisma(manager)
        installed = true
    }
    if (!installed) await installDependcies(true, manager)
    await setTsConfig("noEmit", true)
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
    consola.success("项目初始化完成")
}
