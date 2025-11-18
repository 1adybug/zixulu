import consola from "consola"

import { CommitType } from "@/constant"

import { getCommitMessage } from "./getCommitMessage"
import { getPackageLatestVersion } from "./getPackageLatestVersion"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export async function upgradeRsbuild() {
    const packageJson = await readPackageJson()
    const rsbuildDependencies = Object.entries({
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
    }).filter(([key]) => key.startsWith("@rsbuild/")) as [string, string][]

    const upgradeLogs: string[] = []

    for (const [key, value] of rsbuildDependencies) {
        const version = await getPackageLatestVersion(key)
        const [, b, c] = Array.from(value.match(/^(\D*)(\d.*)$/)!)
        if (c === version) continue
        if (packageJson.dependencies?.[key]) packageJson.dependencies[key] = `${b}${version}`
        if (packageJson.devDependencies?.[key]) packageJson.devDependencies[key] = `${b}${version}`
        upgradeLogs.push(`${key} ${c} => ${version}`)
    }

    if (upgradeLogs.length === 0) return ""
    await writePackageJson({ data: packageJson })
    await installDependceny()
    const upgradeLog = `upgrade dependencies: ${upgradeLogs.join(", ")}`
    consola.success(upgradeLog)
    return getCommitMessage(CommitType.feature, upgradeLog)
}
