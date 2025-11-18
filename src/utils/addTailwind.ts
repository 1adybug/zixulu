import consola from "consola"

import { addDependency } from "./addDependency"
import { addPostCSSConfig } from "./addPostCSSConfig"
import { addPrettier } from "./addPrettier"
import { addTailwindConfig } from "./addTailwindConfig"
import { addTailwindToCss } from "./addTailwindToCss"

/** 添加 tailwind */
export async function addTailwind() {
    consola.start("开始添加 tailwind 配置")
    await addDependency({
        package: [{ packageName: "tailwindcss", versionRange: "^3" }, "autoprefixer", "postcss", "prettier", "prettier-plugin-tailwindcss"],
        type: "devDependencies",
    })
    await addTailwindConfig()
    await addPostCSSConfig()
    await addTailwindToCss()
    await addPrettier()
    consola.success("添加 tailwind 配置成功")
}
