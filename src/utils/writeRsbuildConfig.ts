import { writeFile } from "fs/promises"

export const rsbuildConfig = `import { defineConfig } from "@rsbuild/core"
import { pluginReact } from "@rsbuild/plugin-react"
import { checkPort } from "get-port-please"

async function getPort(start = 5173): Promise<number> {
    if (await checkPort(start)) return start
    return await getPort(start + 1)
}

export default defineConfig(async ({ env, command, envMode }) => {
    const port = await getPort()

    return {
        html: {
            template: "public/index.html"
        },
        plugins: [pluginReact()],
        server: {
            port
        }
    }
})
`

export async function writeRsbuildConfig() {
    await writeFile("rsbuild.config.ts", rsbuildConfig, "utf-8")
}
