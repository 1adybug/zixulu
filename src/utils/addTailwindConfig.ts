import { writeFile } from "fs/promises"
import consola from "consola"

/** Tailwind 默认配置内容 */
export const tailwindConfig = `import { Config } from "tailwindcss"

const config: Config = {
    content: [
        "./index.html",
        "./public/index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}

export default config
`

/** 
 * 添加 Tailwind 配置文件
 * 创建 tailwind.config.ts 文件并写入默认配置
 */
export async function addTailwindConfig() {
    try {
        await writeFile("tailwind.config.ts", tailwindConfig, "utf-8")
        consola.success("添加 tailwind.config.ts 配置成功")
    } catch (error) {
        consola.fail("添加 tailwind.config.ts 配置失败")
    }
}
