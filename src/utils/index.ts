import consola from "consola"
import { Stats, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs"
import { ParsedPath, isAbsolute, join, parse } from "path"
import { Config } from "prettier"
import { cwd, exit } from "process"

function getAbsolutePath(path: string) {
    return isAbsolute(path) ? path : join(cwd(), path)
}

export function getPackageJsonPath(path?: string) {
    return join(getAbsolutePath(path ?? cwd()), "package.json")
}

/** 获取包的最新版本 */
export async function getPackageLatestVersion(packageName: string) {
    try {
        consola.start(`开始获取 ${packageName} 最新版本号...`)
        const url = `https://registry.npmjs.org/${packageName}/latest`
        const response = await fetch(url)
        const data = await response.json()
        consola.success(`获取 ${packageName} 最新版本号成功`)
        return data.version as string
    } catch (error) {
        consola.fail(`获取 ${packageName} 最新版本号失败`)
        exit()
    }
}

/** 读取 package.json */
export function readPackageJson(path?: string): Record<string, any> {
    try {
        const result = JSON.parse(readFileSync(getPackageJsonPath(path), "utf-8"))
        consola.success("读取 package.json 成功")
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 package.json 失败")
        exit()
    }
}

/** 写入依赖 */
export async function addDependencies(packageJson: Record<string, any>, packageName: string, version?: string) {
    try {
        packageJson.dependencies ??= {}
        packageJson.dependencies[packageName] ??= version?.trim() || `^${await getPackageLatestVersion(packageName)}`
        const keys = Object.keys(packageJson.dependencies)
        keys.sort()
        const sortedDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDependencies[key] = packageJson.dependencies[key]
        }
        packageJson.dependencies = sortedDependencies
        consola.success(`添加 ${packageName} 至依赖成功`)
    } catch (error) {
        consola.fail(`添加 ${packageName} 至依赖失败`)
        exit()
    }
}

/** 写入开发依赖 */
export async function addDevDependencies(packageJson: Record<string, any>, packageName: string, version?: string) {
    try {
        packageJson.devDependencies ??= {}
        packageJson.devDependencies[packageName] ??= version?.trim() || `^${await getPackageLatestVersion(packageName)}`
        const keys = Object.keys(packageJson.devDependencies)
        keys.sort()
        const sortedDevDependencies: Record<string, string> = {}
        for (const key of keys) {
            sortedDevDependencies[key] = packageJson.devDependencies[key]
        }
        packageJson.devDependencies = sortedDevDependencies
        consola.success(`添加 ${packageName} 至开发依赖成功`)
    } catch (error) {
        consola.fail(`添加 ${packageName} 至开发依赖失败`)
        exit()
    }
}

/** 写回 package.json */
export function writePackageJson(packageJson: Record<string, any>, path?: string) {
    try {
        writeFileSync(getPackageJsonPath(path), JSON.stringify(packageJson, undefined, 4), "utf-8")
        consola.success("修改 package.json 成功")
    } catch (error) {
        consola.fail("修改 package.json 失败")
        exit()
    }
}

export interface GetFilesOptions {
    depth?: number
    exclude?: (path: ParsedPath, stats: Stats) => boolean
}

export function getFiles(path: string, judge: (path: ParsedPath, stats: Stats) => boolean, depthOrOptions?: number | GetFilesOptions) {
    const result: string[] = []
    function _getFiles(path: string, judge: (path: ParsedPath, stats: Stats) => boolean, depthOrOptions?: number | GetFilesOptions) {
        const options: GetFilesOptions = typeof depthOrOptions === "number" ? { depth: depthOrOptions } : depthOrOptions ?? {}
        const { depth, exclude } = options
        path = getAbsolutePath(path)
        const files = readdirSync(path)
        for (const file of files) {
            const filePath = join(path, file)
            const parsedPath = parse(filePath)
            const stat = statSync(filePath)
            if (judge(parsedPath, stat)) {
                result.push(filePath)
            }
            if (stat.isDirectory() && (!exclude || exclude(parsedPath, stat)) && (depth === undefined || depth > 0)) {
                getFiles(filePath, judge, depth === undefined ? undefined : depth - 1)
            }
        }
    }
    _getFiles(path, judge, depthOrOptions)
    return result
}

/** 删除 ESLint 配置文件 */
export function removeESLint() {
    try {
        const files = getFiles(cwd(), (path, stats) => /\.eslintrc\.[cm]?js/.test(path.base) && stats.isFile(), {
            depth: 1,
            exclude: path => path.base !== "node_modules"
        })
        files.forEach(file => {
            try {
                unlinkSync(file)
            } catch (error) {
                consola.fail(`删除 ${file} 失败`)
            }
        })
        consola.success("删除 ESLint 配置文件成功")
    } catch (error) {
        consola.error(error)
        consola.fail("获取 ESLint 配置文件列表失败")
    }
    try {
        const pkg = readPackageJson()
        Object.keys(pkg.dependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.dependencies[key]
        })
        Object.keys(pkg.devDependencies).forEach(key => {
            if (key.includes("eslint")) delete pkg.devDependencies[key]
        })
        writePackageJson(pkg)
        consola.success("删除 ESLint 依赖成功")
    } catch (error) {
        consola.fail("删除 ESLint 依赖失败")
    }
}

export function vite() {
    try {
        const text = readFileSync(getAbsolutePath("tsconfig.json"), "utf-8")
        const newText = text.replace(/^ +?"noUnusedLocals": true,$\n/m, "").replace(/^ +?"noUnusedParameters": true,$\n/m, "")
        writeFileSync(getAbsolutePath("tsconfig.json"), newText, "utf-8")
        consola.success("修改 tsconfig.json 配置成功")
    } catch (error) {
        consola.fail("修改 tsconfig.json 配置失败")
    }
}

/** 添加 tailwind.config.js 配置成功 */
export function addTailwindConfig() {
    try {
        writeFileSync(
            getAbsolutePath("tailwind.config.js"),
            `/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
    extend: {},
    },
    plugins: [],
}`,
            "utf-8"
        )
        consola.success("添加 tailwind.config.js 配置成功")
    } catch (error) {
        consola.fail("添加 tailwind.config.js 配置失败")
    }
}

/** 添加 postcss.config.js 配置成功 */
export function addPostCSSConfig() {
    try {
        writeFileSync(
            getAbsolutePath("postcss.config.js"),
            `export default {
        plugins: {
            tailwindcss: {},
            autoprefixer: {}
        }
    }`,
            "utf-8"
        )
        consola.success("添加 postcss.config.js 配置成功")
    } catch (error) {
        consola.fail("添加 postcss.config.js 配置失败")
    }
}

/** 添加 tailwind 至 index.css 成功 */
export function addTailwindToCSS() {
    try {
        const css = readFileSync(getAbsolutePath("./src/index.css"), "utf-8")
        writeFileSync(
            getAbsolutePath("./src/index.css"),
            `@tailwind base;    
@tailwind components;
@tailwind utilities;

${css}`,
            "utf-8"
        )
        consola.success("添加 tailwind 至 index.css 成功")
    } catch (error) {
        consola.fail("添加 tailwind 至 index.css 失败")
    }
}

export const prettierConfig: Config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 800,
    trailingComma: "none"
}

export const prettierConfigText = `module.exports = ${JSON.stringify(prettierConfig, undefined, 4)}`

export const prettierConfigTextWithTailwind = `module.exports = ${JSON.stringify({ plugins: ["prettier-plugin-tailwindcss"], ...prettierConfig }, undefined, 4)}`

/** 添加 prettier 配置成功 */
export function addPrettierConfig(tailwind?: boolean) {
    try {
        writeFileSync(getAbsolutePath("./prettier.config.cjs"), tailwind ? prettierConfigTextWithTailwind : prettierConfigText)
        consola.success("添加 prettier 配置成功")
    } catch (error) {
        consola.fail("添加 prettier 配置失败")
    }
}

/** 配置 tailwind */
export async function tailwind() {
    const pkg = readPackageJson()
    await addDevDependencies(pkg, "tailwindcss")
    await addDevDependencies(pkg, "autoprefixer")
    await addDevDependencies(pkg, "postcss")
    await addDevDependencies(pkg, "prettier")
    await addDevDependencies(pkg, "prettier-plugin-tailwindcss")
    writePackageJson(pkg)
    addTailwindConfig()
    addPostCSSConfig()
    addTailwindToCSS()
    addPrettierConfig(true)
}

export function removeComment(path: string) {
    try {
        const text = readFileSync(getAbsolutePath(path), "utf-8")
        const newText = text.replace(/^ *?\/\/.*?$/gm, "")
        writeFileSync(getAbsolutePath(path), newText, "utf-8")
        consola.success("删除注释成功")
    } catch (error) {
        consola.fail("删除注释失败")
    }
}
