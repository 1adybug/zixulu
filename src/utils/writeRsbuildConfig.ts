import { writeFile } from "fs/promises"

export interface WriteRsbuildConfigParams {
    /** 项目标题 */
    title: string
    /** 项目描述 */
    description: string
    /** 挂载 id */
    mountId: string
}

export async function writeRsbuildConfig({
    title,
    description,
    mountId,
}: WriteRsbuildConfigParams) {
    const rsbuildConfig = `import { defineConfig } from "@rsbuild/core"
import { pluginBabel } from "@rsbuild/plugin-babel"
import { pluginReact } from "@rsbuild/plugin-react"
import { pluginSvgr } from "@rsbuild/plugin-svgr"

export default defineConfig({
    html: {
        title: "${title}",
        meta: {
            description: "${description}",
        },
        mountId: "${mountId}",
    },
    plugins: [
        pluginReact(),
        pluginBabel({
            include: /\\.(?:jsx|tsx)$/,
            babelLoaderOptions(config) {
                config.plugins ??= []
                config.plugins?.unshift("babel-plugin-react-compiler")
            },
        }),
        pluginSvgr({
            svgrOptions: {
                exportType: "default",
                svgoConfig: {
                    plugins: [
                        {
                            name: "prefixIds",
                            params: {
                                prefixIds: false,
                                prefixClassNames: false,
                            },
                        },
                    ],
                },
            },
        }),
    ],
    server: {
        port: 5173,
    },
    output: {
        polyfill: "entry",
    },
})
`

    await writeFile("rsbuild.config.ts", rsbuildConfig, "utf-8")
}
