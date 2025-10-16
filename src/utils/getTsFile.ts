import { existsSync } from "fs"
import { join, parse } from "path"

export type TsFile = {
    depth: 0 | 1
    ext: ".ts" | ".tsx"
    path: string
}

export function getTsFile(path: string): TsFile {
    const { ext } = parse(path)
    if (ext !== "" && ext !== ".ts" && ext !== ".tsx")
        throw new Error("请传入 ts 或 tsx 文件")

    if (ext === ".ts" || ext === ".tsx")
        return {
            depth: 0,
            ext: ext,
            path,
        }

    const path2 = path + ".ts"

    if (existsSync(path2))
        return {
            depth: 0,
            ext: ".ts",
            path: path2,
        }

    const path3 = path + ".tsx"

    if (existsSync(path3))
        return {
            depth: 0,
            ext: ".tsx",
            path: path3,
        }

    const path4 = join(path, "index.ts")

    if (existsSync(path4))
        return {
            depth: 1,
            ext: ".ts",
            path: path4,
        }

    const path5 = join(path, "index.tsx")

    if (existsSync(path5))
        return {
            depth: 1,
            ext: ".tsx",
            path: path5,
        }

    throw new Error(`找不到 ${path} 对应的 ts 或 tsx 文件`)
}
