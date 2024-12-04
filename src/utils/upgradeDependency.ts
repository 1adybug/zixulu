import { CommitType } from "@constant/index"
import { getCommitMessage } from "./getCommitMessage"
import { getPackageUpgradeVersion } from "./getPackageUpgradeVersion"
import { UpgradeDependencyConfig, getUpgradeDependencyConfig } from "./getUpgradeDependencyConfig"
import { getVersionFromRequiredVersion } from "./getVersionFromRequiredVersion"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export type UpgradeInfo = {
    package: string
    oldVersion: string
    newVersion: string
    strVersion: string
}

export async function upgradeDependency(config?: UpgradeDependencyConfig): Promise<string> {
    const { dir, types, level } = config ?? (await getUpgradeDependencyConfig())
    const { default: inquirer } = await import("inquirer")
    const packageJson = await readPackageJson(dir)

    if (!packageJson.dependencies && !packageJson.devDependencies) return ""

    if (types.length === 0) return ""

    const upgradeLogs: string[] = []

    for (const type of types) {
        const upgrades: UpgradeInfo[] = []
        const allPkgs = Object.keys(packageJson[type] || {})

        for (let i = 0; i < allPkgs.length; i++) {
            try {
                const pkg = allPkgs[i]
                const rv = packageJson[type][pkg]
                const s = rv.match(/^\D*/)![0]
                const cv = getVersionFromRequiredVersion(rv)

                const version = await getPackageUpgradeVersion({
                    packageName: pkg,
                    version: cv,
                    level,
                })

                if (!version) continue
                upgrades.push({
                    package: pkg,
                    oldVersion: cv,
                    newVersion: version,
                    strVersion: `${s}${version}`,
                })
            } catch (error) {
                continue
            }
        }

        if (upgrades.length === 0) continue

        const choices = upgrades.map(upgrade => ({
            name: `${upgrade.package} ${upgrade.oldVersion} => ${upgrade.newVersion}`,
            value: upgrade.package,
        }))

        const { pkgs } = await inquirer.prompt({
            type: "checkbox",
            name: "pkgs",
            message: "请选择要升级的包",
            choices,
            default: upgrades.map(upgrade => upgrade.package),
        })

        pkgs.forEach((pkg: string) => {
            const upgrade = upgrades.find(upgrade => upgrade.package === pkg)!
            packageJson[type][pkg] = upgrade.strVersion
            upgradeLogs.push(`${pkg} ${upgrade.oldVersion} => ${upgrade.newVersion}`)
        })
    }

    if (upgradeLogs.length === 0) return ""

    await writePackageJson({ data: packageJson, dir })
    await installDependceny()

    return getCommitMessage(CommitType.feature, `upgrade dependencies: ${upgradeLogs.join(", ")}`)
}
