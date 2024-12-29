import { mkdir, writeFile } from "fs/promises"

import { CommitType } from "@src/constant"

import { addDependency } from "./addDependency"
import { getCommitMessage } from "./getCommitMessage"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

const zipDistContent = `// @ts-check
import { rm } from "fs/promises"
import { zip } from "soda-nodejs"

async function main() {
    await rm("dist.zip", { force: true })
    await zip({
        input: "dist",
        output: "dist.zip"
    })
}

main()
`

/**
 * 压缩脚本的配置选项
 */
type AddZipDistConfig = {
    /** 是否自动安装依赖 */
    install?: boolean
}

/**
 * 添加构建产物压缩脚本
 * 1. 添加必要的依赖
 * 2. 创建压缩脚本
 * 3. 修改构建命令
 * 
 * @param config 配置选项
 * @returns commit message
 */
export async function addZipDist({ install }: AddZipDistConfig = {}) {
    await addDependency({
        package: ["soda-nodejs"],
        type: "devDependencies",
    })
    await mkdir("scripts", { recursive: true })
    await writeFile("scripts/zipDist.mjs", zipDistContent, "utf-8")
    const packageJson = await readPackageJson()
    packageJson.scripts.build = `${packageJson.scripts.build} && node scripts/zipDist.mjs`
    await writePackageJson({ data: packageJson })
    if (install) await installDependceny()
    return getCommitMessage(CommitType.feature, "添加压缩脚本")
}
