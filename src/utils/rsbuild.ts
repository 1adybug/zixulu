import consola from "consola"
import { addDevDependencies, readPackageJson } from "."
import { createIndexHtml } from "./createIndexHtml"
import { readTsConfig } from "./readTsConfig"
import { writeRsbuildConfig } from "./writeRsbuildConfig"
import { writeTsConfig } from "./writeTsConfig"

export async function rsbuild() {
    consola.start("开始设置 rsbuild 配置")
    const { default: inquirer } = await import("inquirer")
    const packageJson = await readPackageJson()
    const tsConfig = await readTsConfig()
    tsConfig.compilerOptions.lib = tsConfig.compilerOptions.lib.map((item: string) => (item === tsConfig.compilerOptions.target ? "ESNext" : item))
    tsConfig.compilerOptions.target = "ESNext"
    await writeTsConfig(tsConfig)
    const { description, title, entryId } = await inquirer.prompt([
        {
            type: "input",
            name: "description",
            message: "项目描述",
            default: "designed by someone"
        },
        {
            type: "input",
            name: "title",
            message: "项目标题",
            default: packageJson.name
        },
        {
            type: "input",
            name: "entryId",
            message: "入口 id",
            default: "root"
        }
    ])
    addDevDependencies("get-port-please")
    await writeRsbuildConfig()
    await createIndexHtml({ description, title, entryId })
    consola.success("设置 rsbuild 配置成功")
}
