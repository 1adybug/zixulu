import consola from "consola"
import { addDependency } from "./addDependency"
import { addPostCSSConfig } from "./addPostCSSConfig"
import { addPrettier } from "./addPrettier"
import { addTailwindConfig } from "./addTailwindConfig"
import { addTailwindToCss } from "./addTailwindToCss"

/** 添加 tailwind */
export async function tailwind() {
    consola.start("开始添加 tailwind 配置")
    const addedPackages = await addDependency({
        package: ["tailwindcss", "autoprefixer", "postcss", "prettier", "prettier-plugin-tailwindcss"],
        type: "devDependencies",
    })
    await addTailwindConfig()
    await addPostCSSConfig()
    await addTailwindToCss()
    await addPrettier()
    consola.success("添加 tailwind 配置成功")
}
