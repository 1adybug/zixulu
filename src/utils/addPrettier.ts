import consola from "consola"
import { writeFile } from "fs/promises"
import { exit } from "process"
import { addDevDependencies, prettierConfigText, prettierConfigTextWithTailwind, readPackageJson } from "."

/** 添加 prettier */
export async function addPrettier() {
    consola.start("开始添加 prettier 配置")
    const packageJson = await readPackageJson()
    const tailwind = Object.keys(packageJson.dependencies).includes("tailwindcss") || Object.keys(packageJson.devDependencies).includes("tailwindcss")
    await writeFile("./prettier.config.cjs", tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
    await addDevDependencies("prettier")
    await addDevDependencies("prettier-plugin-tailwindcss")
    consola.success("添加 prettier 配置成功")
}
