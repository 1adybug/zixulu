import consola from "consola"
import { rm, writeFile } from "fs/promises"
import { addDependency } from "./addDependency"
import { checkTailwind } from "./checkTailwind"
import { createIndexHtml } from "./createIndexHtml"
import { readPackageJson } from "./readPackageJson"
import { readTsConfig } from "./readTsConfig"
import { writeRsbuildConfig } from "./writeRsbuildConfig"
import { writeTsConfig } from "./writeTsConfig"

export async function rsbuild() {
    consola.start("开始设置 rsbuild 配置")
    const { default: inquirer } = await import("inquirer")
    await addDependency({
        package: ["@rsbuild/plugin-svgr", "get-port-please"],
        type: "devDependencies",
    })
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
            name: "entryId",
            message: "入口 id",
            default: "root",
        },
    ])
    await writeRsbuildConfig()
    await createIndexHtml({ description, title, entryId })
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
        `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)`,
        "utf-8",
    )
    consola.success("设置 rsbuild 配置成功")
}
