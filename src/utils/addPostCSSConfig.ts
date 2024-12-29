import { rm, writeFile } from "fs/promises"
import consola from "consola"

/** PostCSS 配置文件内容 */
const postcssConfig = `/** @type {import("postcss-load-config").Config} */
const config = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {}
    }
}

export default config            
`

/**
 * 添加 postcss.config.js 配置
 * 会先删除已存在的配置文件，然后创建新的
 */
export async function addPostCSSConfig() {
    try {
        await rm("postcss.config.js", { force: true })
        await rm("postcss.config.mjs", { force: true })
        await rm("postcss.config.cjs", { force: true })
        await writeFile("postcss.config.mjs", postcssConfig, "utf-8")
        consola.success("添加 postcss.config.mjs 配置成功")
    } catch (error) {
        consola.fail("添加 postcss.config.mjs 配置失败")
    }
}
