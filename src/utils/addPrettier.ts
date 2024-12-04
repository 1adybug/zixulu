import consola from "consola"
import { writeFile } from "fs/promises"
import { AddDependenciesConfig, addDependency } from "./addDependency"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export const prettierConfigText = `/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: ["prettier-plugin-organize-imports"],
}

export default config
`

export const prettierConfigTextWithTailwind = `/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
}

export default config
`

/** 添加 prettier */
export async function addPrettier() {
    consola.start("开始添加 prettier 配置")
    const packageJson = await readPackageJson()
    const tailwind =
        Object.keys(packageJson.dependencies ?? {}).includes("tailwindcss") || Object.keys(packageJson.devDependencies ?? {}).includes("tailwindcss")
    await writeFile("./prettier.config.mjs", tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
    const config: AddDependenciesConfig = {
        package: ["prettier", "prettier-plugin-organize-imports"],
        type: "devDependencies",
    }
    if (tailwind) (config.package as string[]).push("prettier-plugin-tailwindcss")
    await addDependency(config)
    const packageJson2 = await readPackageJson()
    packageJson2.scripts ??= {}
    packageJson2.scripts.lint = "prettier --write ."
    await writePackageJson({ data: packageJson2 })
    await installDependceny()
    consola.success("添加 prettier 配置成功")
}
