import consola from "consola"
import { createIndexHtml, readPackageJson, writeRsbuildConfig } from "."

export async function rsbuild() {
    consola.start("开始设置 rsbuild 配置")
    const { default: inquirer } = await import("inquirer")
    const packageJson = await readPackageJson()
    const { description, title, entryId } = await inquirer.prompt([
        {
            type: "input",
            name: "description",
            message: "项目描述",
            default: "designed by luzixu"
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
    await writeRsbuildConfig()
    await createIndexHtml({ description, title, entryId })
    consola.success("设置 rsbuild 配置成功")
}
