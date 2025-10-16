import consola from "consola"

import { getPackageJsonPath } from "./getPackageJsonPath"
import { writeJson } from "./writeJson"

export type WritePackageJsonConfig = {
    data: Record<string, unknown>
    dir?: string
}

/** 写回 package.json */
export async function writePackageJson({
    data,
    dir,
}: WritePackageJsonConfig): Promise<void> {
    try {
        await writeJson({ data, output: getPackageJsonPath(dir) })
        consola.success("修改 package.json 成功")
    } catch (error) {
        consola.fail("修改 package.json 失败")
        throw error
    }
}
