import { readFileSync } from "node:fs"

import consola from "consola"

import { getPackageJsonPath } from "./getPackageJsonPath"

/**
 * 读取 package.json
 * @param dir 目录
 * @returns package.json
 */

export function readPackageJsonSync(dir?: string): Record<string, any> {
    try {
        const result = JSON.parse(readFileSync(getPackageJsonPath(dir), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 package.json 失败")
        throw new Error("读取 package.json 失败")
    }
}
