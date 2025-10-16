import { existsSync } from "fs"
import { writeFile } from "fs/promises"

import { addDependency } from "./addDependency"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { readTsConfig } from "./readTsConfig"
import { Module, ModuleResolution, Target } from "./setTsConfig"
import { writePackageJson } from "./writePackageJson"
import { writeTsConfig } from "./writeTsConfig"

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
    plugins: [typescript(), resolve(), commonjs(), json()],
    external: ["@resvg/resvg-js", "@types/cors", "@types/express", "@types/node", "cors", "dotenv", "express", "get-port-please", "next", "react", "react-dom", "soda-nodejs"]
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
    await addDependency({
        package: [
            "@rollup/plugin-commonjs",
            "@rollup/plugin-json",
            "@rollup/plugin-node-resolve",
            "@rollup/plugin-typescript",
            "rollup",
            "typescript",
        ],
        type: "devDependencies",
    })

    const packageJson = await readPackageJson()

    if (packageJson.scripts.build)
        packageJson.scripts["build:rollup"] =
            "rollup -c rollup.config.ts --configPlugin @rollup/plugin-typescript"
    else
        packageJson.scripts.build =
            "rollup -c rollup.config.ts --configPlugin @rollup/plugin-typescript"

    await writePackageJson({ data: packageJson })
    await writeFile("rollup.config.ts", rollupConfig, "utf-8")

    if (existsSync("tsconfig.json")) {
        const tsconfig = await readTsConfig()
        tsconfig.compilerOptions ??= {}
        tsconfig.compilerOptions.target = Target.ESNext
        tsconfig.compilerOptions.module = Module.ESNext
        tsconfig.compilerOptions.moduleResolution = ModuleResolution.Bundler
        tsconfig.compilerOptions.strict = true
        tsconfig.compilerOptions.skipLibCheck = true
        await writeTsConfig({ data: tsconfig })
    } else {
        await writeFile("tsconfig.json", tsconfig, "utf-8")
    }

    await installDependceny()
}
