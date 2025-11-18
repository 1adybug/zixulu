import { writeFile } from "fs/promises"

import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

const rslibConfig = `import { defineConfig } from "@rslib/core"

export default defineConfig({
    source: {
        entry: {
            index: ["./src/**"],
        },
    },
    lib: [
        {
            bundle: false,
            dts: true,
            format: "esm",
        },
        {
            bundle: false,
            dts: true,
            format: "cjs",
        },
    ],
    output: {
        target: "web",
    },
})
`

const rslibConfigWithReact = `import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"

export default defineConfig({
    source: {
        entry: {
            index: ["./src/**"],
        },
    },
    lib: [
        {
            bundle: false,
            dts: true,
            format: "esm",
        },
        {
            bundle: false,
            dts: true,
            format: "cjs",
        },
    ],
    output: {
        target: "web",
    },
    plugins: [pluginReact()],
})
`

const tsconfig = `{
    "compilerOptions": {
        "baseUrl": ".",
        "strict": true,
        "declaration": true,
        "skipLibCheck": true,
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "paths": {
            "@/*": ["src/*"]
        }
    },
    "include": ["src"]
}
`

const tsconfigWithReact = `{
    "compilerOptions": {
        "baseUrl": ".",
        "strict": true,
        "declaration": true,
        "skipLibCheck": true,
        "jsx": "react-jsx",
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "paths": {
            "@/*": ["src/*"]
        }
    },
    "include": ["src"]
}
`

export async function rslib() {
    const { name, version, description, scripts, dependencies, devDependencies, peerDependencies } = await readPackageJson()

    const newPackageJson = {
        name,
        version,
        description,
        type: "module",
        exports: {
            ".": {
                types: "./dist/index.d.ts",
                import: "./dist/index.js",
                require: "./dist/index.cjs",
            },
        },
        main: "./dist/index.cjs",
        module: "./dist/index.js",
        types: "./dist/index.d.ts",
        sideEffects: false,
        scripts,
        keywords: [],
        authors: ["lurongv@qq.com"],
        license: "MIT",
        files: ["dist", "src", "tsconfig.json"],
        publishConfig: {
            access: "public",
            registry: "https://registry.npmjs.com/",
        },
        repository: {
            type: "git",
            url: "git+https://github.com/1adybug/deepsea.git",
        },
        homepage: `https://github.com/1adybug/deepsea/tree/main/packages/${name}`,
        dependencies,
        devDependencies,
        peerDependencies,
    }

    await writePackageJson({ data: newPackageJson })
    const hasReact = !!dependencies?.["react"] || !!devDependencies?.["react"] || !!peerDependencies?.["react"]
    await writeFile("rslib.config.ts", hasReact ? rslibConfigWithReact : rslibConfig, "utf-8")
    await writeFile("tsconfig.json", hasReact ? tsconfigWithReact : tsconfig, "utf-8")
}
