import consola from "consola"
import { writeFile } from "fs/promises"
import { AddDependenciesConfig, addDependency } from "./addDependency"
import { readPackageJson } from "./readPackageJson"

export const prettierConfigText = `module.exports = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160
}
`

export const prettierConfigTextWithTailwind = `module.exports = {
    plugins: ["prettier-plugin-tailwindcss"],
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160
}
`

/** 添加 prettier */
export async function addPrettier() {
    consola.start("开始添加 prettier 配置")
    const packageJson = await readPackageJson()
    const tailwind = Object.keys(packageJson.dependencies ?? {}).includes("tailwindcss") || Object.keys(packageJson.devDependencies ?? {}).includes("tailwindcss")
    await writeFile("./prettier.config.cjs", tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
    const config: AddDependenciesConfig = {
        package: ["prettier"],
        type: "devDependencies"
    }
    if (tailwind) (config.package as string[]).push("prettier-plugin-tailwindcss")
    await addDependency(config)
    consola.success("添加 prettier 配置成功")
}
