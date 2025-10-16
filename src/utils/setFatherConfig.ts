import { rm, writeFile } from "fs/promises"

import consola from "consola"

import { addGitignore } from "./addGitignore"
import { readPackageJson } from "./readPackageJson"
import { Module, ModuleResolution, setTsConfig, Target } from "./setTsConfig"
import { sortArrayOrObject } from "./sortArrayOrObject"
import { writePackageJson } from "./writePackageJson"

const fatherrcCode = `import { defineConfig } from "father"

export default defineConfig({
    esm: {},
    cjs: {},
    targets: {
        node: 18,
        chrome: 100
    },
    sourcemap: true
})
`

export async function setFatherConfig() {
    consola.start("开始设置 father 配置")
    let packageJson = await readPackageJson()
    packageJson.publishConfig ??= {}
    packageJson.publishConfig.access = "public"
    packageJson.publishConfig.registry = "https://registry.npmjs.org/"
    packageJson.publishConfig = sortArrayOrObject(packageJson.publishConfig)
    packageJson.files ??= []
    if (!packageJson.files.includes("src")) packageJson.files.push("src")
    packageJson.files = sortArrayOrObject(packageJson.files)
    const dependencies = packageJson.dependencies
    const devDependencies = packageJson.devDependencies
    const peerDependencies = packageJson.peerDependencies
    if (
        packageJson.repository?.url &&
        !packageJson.repository.url.startsWith("git+")
    )
        packageJson.repository.url = `git+${packageJson.repository.url}.git`
    packageJson.repository ??= {}
    packageJson.repository.type ??= "git"
    packageJson.repository.url ??= `git+https://github.com/1adybug/${packageJson.name}.git`

    if (!packageJson.types) {
        packageJson = Object.entries(packageJson).reduce((
            prev: Record<string, unknown>,
            [key, value],
        ) => {
            prev[key] = value

            if (Object.hasOwn(packageJson, "module")) {
                if (key === "module")
                    prev.types = value.replace(/\.js$/, ".d.ts")
            } else if (Object.hasOwn(packageJson, "main")) {
                if (key === "main") prev.types = value.replace(/\.js$/, ".d.ts")
            }

            return prev
        }, {})
    }

    delete packageJson.dependencies
    delete packageJson.devDependencies
    delete packageJson.peerDependencies
    packageJson.dependencies = sortArrayOrObject(dependencies)
    packageJson.devDependencies = sortArrayOrObject(devDependencies)
    packageJson.peerDependencies = sortArrayOrObject(peerDependencies)
    await addGitignore()
    await writePackageJson({ data: packageJson })
    await writeFile(".fatherrc.ts", fatherrcCode)
    await setTsConfig("target", Target.ESNext)
    await setTsConfig("module", Module.ESNext)
    await setTsConfig("moduleResolution", ModuleResolution.Bundler)
    await rm("src/client", { recursive: true, force: true })
    await rm("src/server", { recursive: true, force: true })
    await writeFile("src/index.ts", "")
    consola.success("设置 father 配置成功")
}
