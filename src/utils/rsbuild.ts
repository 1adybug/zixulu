import { rm, writeFile } from "fs/promises"
import consola from "consola"

import { addDependency } from "./addDependency"
import { checkTailwind } from "./checkTailwind"
import { readPackageJson } from "./readPackageJson"
import { readTsConfig } from "./readTsConfig"
import { WriteRsbuildConfigParams, writeRsbuildConfig } from "./writeRsbuildConfig"
import { writeTsConfig } from "./writeTsConfig"

export async function rsbuild() {
    consola.start("开始设置 rsbuild 配置")
    const { default: inquirer } = await import("inquirer")
    await addDependency({
        package: ["@rsbuild/plugin-svgr", "@rsbuild/plugin-babel", { packageName: "babel-plugin-react-compiler", versionRange: "@rc" }],
        type: "devDependencies",
    })
    const packageJson = await readPackageJson()
    const tsConfig = await readTsConfig()
    tsConfig.compilerOptions.lib = tsConfig.compilerOptions.lib.map((item: string) => (item === tsConfig.compilerOptions.target ? "ESNext" : item))
    tsConfig.compilerOptions.target = "ESNext"
    await writeTsConfig(tsConfig)
    const { description, title, mountId } = await inquirer.prompt<WriteRsbuildConfigParams>([
        {
            type: "input",
            name: "description",
            message: "项目描述",
            default: "designed by someone",
        },
        {
            type: "input",
            name: "title",
            message: "项目标题",
            default: packageJson.name,
        },
        {
            type: "input",
            name: "mountId",
            message: "入口 id",
            default: "root",
        },
    ])
    await writeRsbuildConfig({ description, title, mountId })
    await rm(`src/App.css`, { force: true })

    await writeFile(
        `src/index.css`,
        (await checkTailwind())
            ? `@tailwind base;    
@tailwind components;
@tailwind utilities;
`
            : ``,
        "utf-8",
    )

    await writeFile(
        `src/App.tsx`,
        `import { FC } from "react"

const App: FC = () => {
    return <div>Hello, World!</div>
}

export default App`,
        "utf-8",
    )

    await writeFile(
        `src/index.tsx`,
        `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"

import "./index.css"

const root = createRoot(document.getElementById("${mountId}") as HTMLDivElement)

root.render(
    <StrictMode>
        <App />
    </StrictMode>
)`,
        "utf-8",
    )
    consola.success("设置 rsbuild 配置成功")
}
