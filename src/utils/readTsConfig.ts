import consola from "consola"
import { readFile } from "fs/promises"
import JSON5 from "json5"
import { exit } from "process"
import { getTsConfigJsonPath } from "./getTsConfigPath"

/** 读取 tsconfig.json */
export async function readTsConfig(path?: string): Promise<Record<string, any>> {
    try {
        const result = JSON5.parse(await readFile(getTsConfigJsonPath(path), "utf-8"))
        return result
    } catch (error) {
        consola.error(error)
        consola.fail("读取 tsconfig.json 失败")
        exit()
    }
}
