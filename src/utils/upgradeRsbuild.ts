import { CommitType } from "@src/constant"
import { getCommitMessage } from "./getCommitMessage"
import { getPackageLatestVersion } from "./getPackageLatestVersion"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"
import { installDependceny } from "./installDependceny"

export async function upgradeRsbuild() {
    const packageJson = await readPackageJson()
    const rsbuildDependencies = Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies }).filter(([key]) => key.startsWith("@rsbuild/")) as [string, string][]
    const upgradeLogs: string[] = []
    for (const [key, value] of rsbuildDependencies) {
        const version = await getPackageLatestVersion(key)
        const [a, b, c] = Array.from(value.match(/^(\D*)(\d.*)$/)!)
        if (c === version) continue
        packageJson.dependencies?.[key] && (packageJson.dependencies[key] = `${b}${version}`)
        packageJson.devDependencies?.[key] && (packageJson.devDependencies[key] = `${b}${version}`)
        upgradeLogs.push(`${key} ${c} => ${version}`)
    }
    if (upgradeLogs.length === 0) return ""
    await writePackageJson({ data: packageJson })
    await installDependceny()
    return getCommitMessage(CommitType.feature, `upgrade dependencies: ${upgradeLogs.join(", ")}`)
}
