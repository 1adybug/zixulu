import { exit } from "process"
import { getCommitMessage, getPackageUpgradeVersion, getVersionFromRequiredVersion, installDependcies, readPackageJson, writePackageJson } from "."
import { CommitType } from "../constant"
import { checkType } from "./checkType"

export async function upgradeDependency() {
    const { default: inquirer } = await import("inquirer")

    const packageJson = await readPackageJson()

    if (!packageJson.dependencies && !packageJson.devDependencies) exit()

    const { types } = await inquirer.prompt({
        type: "checkbox",
        name: "types",
        message: "请选择要升级的依赖类型",
        choices: ["dependencies", "devDependencies"].filter(type => !!packageJson[type]),
        default: ["dependencies", "devDependencies"]
    })

    if (types.length === 0) exit()

    const { level } = await inquirer.prompt({
        type: "list",
        name: "level",
        message: "请选择升级的级别",
        choices: ["major", "minor", "patch"],
        default: "minor"
    })

    const updateLogs: string[] = []

    for (const type of types) {
        const upgrades: { package: string; oldVersion: string; newVersion: string; strVersion: string }[] = []
        const allPkgs = Object.keys(packageJson[type])

        for (let i = 0; i < allPkgs.length; i++) {
            try {
                const pkg = allPkgs[i]
                const rv = packageJson[type][pkg]
                const s = rv.match(/^\D*/)![0]
                const cv = getVersionFromRequiredVersion(rv)
                const version = await getPackageUpgradeVersion(pkg, cv, level)
                if (!version) continue
                upgrades.push({ package: pkg, oldVersion: cv, newVersion: version, strVersion: `${s}${version}` })
            } catch (error) {
                continue
            }
        }

        if (upgrades.length === 0) continue

        const { pkgs } = await inquirer.prompt({
            type: "checkbox",
            name: "pkgs",
            message: "请选择要升级的包",
            choices: upgrades.map(upgrade => ({ name: `${upgrade.package} ${upgrade.oldVersion} => ${upgrade.newVersion}`, value: upgrade.package }))
        })

        pkgs.forEach((pkg: string) => {
            const upgrade = upgrades.find(upgrade => upgrade.package === pkg)!
            packageJson[type][pkg] = upgrade.strVersion
            updateLogs.push(`${pkg} ${upgrade.oldVersion} => ${upgrade.newVersion}`)
        })
    }

    if (updateLogs.length === 0) exit()
    await writePackageJson(packageJson)
    const result = await installDependcies()
    if (result) await checkType()
    return getCommitMessage(CommitType.feature, `upgrade dependencies: ${updateLogs.join(", ")}`)
}
