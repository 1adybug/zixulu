import { CommitType } from "@src/constant"
import consola from "consola"
import { rename } from "fs/promises"
import { getCommitMessage } from "./getCommitMessage"
import { getPackageUpgradeVersion } from "./getPackageUpgradeVersion"
import { getPackageVersionInDependcy } from "./getPackageVersionInDependcy"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export async function upgradeTailwind() {
    const version = await getPackageVersionInDependcy("tailwindcss")
    if (!version) throw new Error("tailwindcss not found")
    const newVersion = await getPackageUpgradeVersion({
        packageName: "tailwindcss",
        version,
        level: "minor",
    })
    if (newVersion === version) throw new Error("tailwindcss is already the latest version")
    const packageJson = await readPackageJson()
    packageJson.dependencies?.tailwindcss && (packageJson.dependencies.tailwindcss = `^${newVersion}`)
    packageJson.devDependencies?.tailwindcss && (packageJson.devDependencies.tailwindcss = `^${newVersion}`)
    await rename(`patches/tailwindcss@${version}.patch`, `patches/tailwindcss@${newVersion}.patch`)
    delete packageJson.pnpm.patchedDependencies[`tailwindcss@${version}`]
    packageJson.pnpm.patchedDependencies[`tailwindcss@${newVersion}`] = `patches/tailwindcss@${newVersion}.patch`
    await writePackageJson({ data: packageJson })
    await installDependceny()
    const upgradeLog = `upgrade dependencies: tailwindcss ${version} => ${newVersion}`
    consola.success(upgradeLog)
    return getCommitMessage(CommitType.feature, upgradeLog)
}
