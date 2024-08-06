import consola from "consola"
import { readFile } from "fs/promises"
import { getPackageJsonPath } from "./getPackageJsonPath"

/**
 * 读取 package.json
 * @param dir 目录
 * @returns package.json
 */
export async function readPackageJson(dir?: string): Promise<Record<string, any>> {
    try {
        const result = JSON.parse(await readFile(getPackageJsonPath(dir), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail(`读取 ${getPackageJsonPath(dir)} 失败`)
        throw new Error("读取 package.json 失败")
    }
}
