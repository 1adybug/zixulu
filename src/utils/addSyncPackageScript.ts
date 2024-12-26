import { mkdir, writeFile } from "fs/promises"

import { CommitType } from "@src/constant"

import { getCommitMessage } from "./getCommitMessage"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export type AddSyncPackageScriptParams = {
    /** 是否是 monorepo */
    monorepo?: boolean
}

export async function addSyncPackageScript({ monorepo }: AddSyncPackageScriptParams = {}) {
    let dir: string | undefined
    const { default: inquirer } = await import("inquirer")
    if (monorepo) {
        type Answer = {
            dir: string
        }
        const result = await inquirer.prompt<Answer>([
            {
                type: "input",
                name: "dir",
                message: "请输入包目录",
                default: "packages",
            },
        ])
        dir = result.dir
    }
    const syncPackageScript = `// @ts-check

/**
 * 同步包
 * @param {string} packageName 包名
 */
function syncPackage(packageName) {
    return fetch(\`https://registry-direct.npmmirror.com/-/package/\${packageName}/syncs\`, {
        referrer: "https://npmmirror.com/",
        referrerPolicy: "strict-origin-when-cross-origin",
        method: "PUT",
        mode: "cors",
        credentials: "omit",
    })
}

${
    monorepo
        ? `async function main() {
    const { readdir, readFile, stat } = await import("fs/promises")
    const { join } = await import("path")
    const dir = "packages"
    const dir2 = await readdir(dir)
    /** @type {string[]} */
    const packages2 = []
    for (const item of dir2) {
        const stat2 = await stat(join(dir, item))
        if (!stat2.isDirectory()) continue
        const dir3 = await readdir(join(dir, item))
        if (!dir3.includes("package.json")) continue
        const packageJson = JSON.parse(await readFile(join(dir, item, "package.json"), "utf-8"))
        if (packageJson.private) continue
        packages2.push(packageJson.name)
    }
    await Promise.all(packages2.map(syncPackage))
}`
        : `async function main() {
    const { readFile } = await import("fs/promises")
    const packageJson = JSON.parse(await readFile("package.json", "utf-8"))
    await syncPackage(packageJson.name)
}`
}

main()
`
    await mkdir("scripts", { recursive: true })
    await writeFile("scripts/syncPackage.mjs", syncPackageScript)
    const packageJson = await readPackageJson()
    packageJson.scripts ??= {}
    let name = "sync"
    if (packageJson.scripts.sync) {
        type Answer = {
            override: boolean
        }
        const { override } = await inquirer.prompt<Answer>([
            {
                type: "confirm",
                name: "override",
                message: "sync 命令已存在，是否覆盖",
                default: false,
            },
        ])
        if (!override) {
            type Answer = {
                name: string
            }
            const answer = await inquirer.prompt<Answer>([
                {
                    type: "input",
                    name: "name",
                    message: "请输入同步包脚本名称",
                    default: "syncPackage",
                },
            ])
            name = answer.name
        }
    }
    packageJson.scripts[name] = "node scripts/syncPackage.mjs"
    if (packageJson.scripts.postpublish) packageJson.scripts.postpublish += ` && npm run ${name}`
    else packageJson.scripts.postpublish = `npm run ${name}`
    await writePackageJson({ data: packageJson })
    return getCommitMessage(CommitType.feature, "添加同步包脚本")
}
