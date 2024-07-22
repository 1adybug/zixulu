import { existsSync } from "fs"
import { writeFile } from "fs/promises"
import { addDevDependencies, installDependceny, readPackageJson, writePackageJson } from "."
import { Module, ModuleResolution, setTsConfig, Target } from "./setTsConfig"

const rollupConfig = `import commonjs from "@rollup/plugin-commonjs"
import json from "@rollup/plugin-json"
import resolve from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import { RollupOptions } from "rollup"

const config: RollupOptions = {
    input: "src/index.ts",
    output: {
        file: "dist/index.js",
        format: "cjs"
    },
    plugins: [typescript(), resolve(), commonjs(), json()]
}

export default config
`

const tsconfig = `{
    "compilerOptions": {
        "target": "ESNext",
        "module": "EsNext",
        "moduleResolution": "Bundler",
        "strict": true,
        "skipLibCheck": true
    }
}
`

export async function rollup() {
    await addDevDependencies("@rollup/plugin-commonjs", "@rollup/plugin-json", "@rollup/plugin-node-resolve", "@rollup/plugin-typescript", "rollup", "typescript")
    const packageJson = await readPackageJson()
    if (packageJson.scripts.build) packageJson.scripts["build:rollup"] = "rollup -c rollup.config.ts --configPlugin @rollup/plugin-typescript"
    else packageJson.scripts.build = "rollup -c rollup.config.ts --configPlugin @rollup/plugin-typescript"
    await writePackageJson(packageJson)
    await writeFile("rollup.config.ts", rollupConfig, "utf-8")
    if (existsSync("tsconfig.json")) {
        await setTsConfig("target", Target.ESNext)
        await setTsConfig("module", Module.ESNext)
        await setTsConfig("moduleResolution", ModuleResolution.Bundler)
    } else {
        await writeFile("tsconfig.json", tsconfig, "utf-8")
    }
    await installDependceny()
}
