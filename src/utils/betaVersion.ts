import consola from "consola"
import dayjs from "dayjs"
import inquirer from "inquirer"
import { execAsync, spawnAsync } from "soda-nodejs"

import { backupFirst } from "./backupFirst"
import { isRepository } from "./isRepository"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

/**
 * 获取新的测试版本号
 * 如果当前是测试版本，则生成新的测试版本号
 * 如果当前是正式版本，则提示选择升级级别后生成测试版本号
 * @returns 新的测试版本号
 */
export async function getBetaVersion() {
    const packageJson = await readPackageJson()
    const { version } = packageJson
    const reg = /^(\d+)\.(\d+)\.(\d+)(-beta\.(\d+))?$/
    const match = version.match(reg)

    if (!match) {
        consola.error("版本号不符合规范")
        throw new Error("版本号不符合规范")
    }

    const [, major, minor, patch, , beta] = match

    if (beta) {
        const newVersion = `${major}.${minor}.${patch}-beta.${dayjs().format("YYYYMMDDHHmmss")}`
        packageJson.version = newVersion
        return newVersion
    }

    const { level } = await inquirer.prompt({
        type: "list",
        name: "level",
        message: "请选择升级的级别",
        choices: ["major", "minor", "patch", "none"],
    })
    let newBaseVersion = ""

    switch (level) {
        case "major":
            newBaseVersion = `${parseInt(major) + 1}.0.0`
            break
        case "minor":
            newBaseVersion = `${major}.${parseInt(minor) + 1}.0`
            break
        case "patch":
            newBaseVersion = `${major}.${minor}.${parseInt(patch) + 1}`
            break
        case "none":
            newBaseVersion = `${major}.${minor}.${patch}`
            break
    }

    const newVersion = `${newBaseVersion}-beta.${dayjs().format("YYYYMMDDHHmmss")}`
    packageJson.version = newVersion
    return newVersion
}

/**
 * 发布测试版本
 * 1. 备份当前代码
 * 2. 更新版本号
 * 3. 提交代码并打标签
 * 4. 可选发布到 npm
 */
export async function betaVersion() {
    await backupFirst()
    const version = await getBetaVersion()
    const packageJson = await readPackageJson()
    packageJson.version = version
    await writePackageJson({ data: packageJson })

    if (await isRepository()) {
        await execAsync("git add .")
        await execAsync(`git commit -m "${version}"`)
        await execAsync(`git tag ${version}`)
    }

    const { publish } = await inquirer.prompt({
        type: "confirm",
        name: "publish",
        message: "是否现在发布",
    })

    if (publish)
        await spawnAsync("npm publish --tag beta", {
            shell: true,
            stdio: "inherit",
        })
}
