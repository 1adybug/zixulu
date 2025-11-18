import { rm } from "fs/promises"

import consola from "consola"
import inquirer from "inquirer"

import { getFiles } from "./getFiles"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

/**
 * 删除 ESLint 配置文件
 */
export async function removeESLint() {
    consola.start("开始删除 ESLint 配置文件")

    const files = await getFiles({
        match: (path, stats) => path.base.toLowerCase().includes("eslint") && stats.isFile(),
        exclude: (path, stats) => path.base === "node_modules" && stats.isDirectory(),
    })

    const { selectedFiles } = await inquirer.prompt({
        type: "checkbox",
        name: "selectedFiles",
        message: "选择要删除的文件",
        choices: files,
        default: files,
    })

    for (const file of selectedFiles)
        try {
            await rm(file, { force: true, recursive: true })
        } catch {
            consola.fail(`删除 ${file} 失败`)
        }

    consola.success("删除 ESLint 配置文件成功")
    consola.start("开始删除 ESLint 依赖")

    const pkg = await readPackageJson()

    if (pkg.dependencies)
        Object.keys(pkg.dependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.dependencies[key]
        })

    if (pkg.devDependencies)
        Object.keys(pkg.devDependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.devDependencies[key]
        })

    await writePackageJson({ data: pkg })

    consola.success("删除 ESLint 依赖成功")
}
