import consola from "consola"
import { addDevDependencies, addPostCSSConfig, addTailwindConfig, addTailwindToCSS } from "."
import { addPrettier } from "./addPrettier"

/** 添加 tailwind */
export async function addTailwind() {
    consola.start("开始添加 tailwind 配置")
    await addDevDependencies("tailwindcss", "autoprefixer", "postcss", "prettier", "prettier-plugin-tailwindcss")
    await addTailwindConfig()
    await addPostCSSConfig()
    await addTailwindToCSS()
    await addPrettier()
    consola.success("添加 tailwind 配置成功")
}
