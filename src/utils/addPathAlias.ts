import { readFile, writeFile } from "fs/promises"
import { join, parse } from "path"
import inquirer from "inquirer"

import { CommitType } from "@src/constant"

import { getCommitMessage } from "./getCommitMessage"
import { getFiles } from "./getFiles"
import { getRelativePath } from "./getRelativePath"
import { getTsFile } from "./getTsFile"
import { readTsConfig } from "./readTsConfig"
import { writeTsConfig } from "./writeTsConfig"

/**
 * 获取路径别名配置
 * @param name 别名名称
 */
export async function getPathAlias(name: string) {
    const folder = await getFiles({
        match(path, stats) {
            return stats.isDirectory() && path.base === name
        },
        exclude(path, stats) {
            return (
                stats.isDirectory() &&
                (path.base === "node_modules" || path.base === ".git" || path.base === ".vscode" || path.base === "dist" || path.base === "build")
            )
        },
        count: 1,
    })
    const defaultPath = folder[0] ? getRelativePath(folder[0]) : undefined
    const { path } = await inquirer.prompt({
        type: "input",
        name: "path",
        message: `请输入你的 @${name}/ 的路径`,
        default: defaultPath,
    })
    return path
}

/** 路径别名配置项 */
export type PathAlias = {
    name: string
    path: string
}

/**
 * 添加路径别名配置到 tsconfig.json
 */
export async function addPathAlias(name: string, path: string): Promise<void>
export async function addPathAlias(alias: PathAlias[]): Promise<void>
export async function addPathAlias(nameOrAlias: string | PathAlias[], path?: string) {
    nameOrAlias = Array.isArray(nameOrAlias) ? nameOrAlias : [{ name: nameOrAlias, path: path! }]
    const tsConfig = await readTsConfig()
    tsConfig.compilerOptions ??= {}
    tsConfig.compilerOptions.paths ??= {}
    nameOrAlias.forEach(({ name, path }) => {
        tsConfig.compilerOptions.paths[`@${name}/*`] ??= []
        path = `${getRelativePath(path)}/*`
        if (!tsConfig.compilerOptions.paths[`@${name}/*`].includes(path)) tsConfig.compilerOptions.paths[`@${name}/*`].push(path)
    })
    await writeTsConfig(tsConfig)
}

/**
 * 替换所有文件中的相对路径为路径别名
 */
export async function replacePathAlias() {
    const tsConfig = await readTsConfig()
    const oldPaths: Record<string, string[]> = tsConfig.compilerOptions?.paths ?? {}
    const paths: Record<string, string[]> = {}
    Object.entries(oldPaths).forEach(([key, value]) => {
        paths[key.replace(/\/?\*?$/, "")] = value.map(item => item.replace(/\/?\*?$/, ""))
    })
    const files = await getFiles({
        match(path, stats) {
            return (path.ext === ".ts" || path.ext === ".tsx") && stats.isFile()
        },
        exclude(path, stats) {
            return (
                stats.isDirectory() &&
                (path.base === "node_modules" || path.base === ".git" || path.base === ".vscode" || path.base === "dist" || path.base === "build")
            )
        },
    })
    const reg = /(import [\d\D]*?")(.+?)(")/gm
    for (const file of files) {
        let code = await readFile(file, "utf-8")
        code = code.replace(reg, (match: string, arg: string, arg2: string, arg3: string) => {
            // 如果不是相对路径，直接返回
            if (!arg2.startsWith("./") && !arg2.startsWith("../")) return match

            /** 获取最终的 ts 文件地址 */
            let pathToReplace: string
            let depth: 0 | 1
            try {
                const tsFile = getTsFile(getRelativePath(join(file, "../", arg2)))
                pathToReplace = tsFile.path
                depth = tsFile.depth
            } catch {
                return match
            }

            pathToReplace = getRelativePath(pathToReplace)

            // 如果就是本目录的文件，直接返回
            if (arg2.startsWith("./")) {
                const f = arg2.slice(2)
                if (parse(f).base === f && depth === 0) return match
            }

            let matchedKey = ""
            let matchedPath = ""
            Object.entries(paths).forEach(([key, value]) => {
                value.forEach(item => {
                    /** 必须等于路径或者以路径开头 */
                    if (pathToReplace === item || pathToReplace.startsWith(`${item}/`)) {
                        if (!matchedPath || item.length > matchedPath.length) {
                            matchedKey = key
                            matchedPath = item
                        }
                    }
                })
            })
            if (matchedKey && matchedPath) {
                const newPath = `${matchedKey}${pathToReplace.slice(matchedPath.length)}`.replace(/\/$/, "").replace(/\.tsx?$/, "")
                const finalPath = `${arg}${newPath}${arg3}`
                return finalPath
            }
            return match
        })
        await writeFile(file, code, "utf-8")
    }
    return getCommitMessage(CommitType.feature, "replace path alias")
}

/**
 * 为文件夹添加路径别名
 */
export async function addFolderPathAlias() {
    const { folder } = await inquirer.prompt({
        type: "input",
        name: "folder",
        message: "请输入文件夹路径",
        default: ".",
    })
    const dir = await getFiles({
        match(path, stats) {
            return stats.isDirectory()
        },
        depth: 1,
        dir: folder,
    })
    const names = dir.map(item => parse(item).name)
    const { result } = await inquirer.prompt({
        type: "checkbox",
        name: "result",
        message: "请选择要添加的文件夹",
        choices: names,
        default: names.filter(item => item !== "node_modules" && item !== ".git" && item !== ".vscode" && item !== "dist" && item !== "build"),
    })
    await addPathAlias(result.map((item: string) => ({ name: item, path: getRelativePath(join(folder, item)) })))
    return getCommitMessage(CommitType.feature, `add path alias: ${result.join(", ")}`)
}
