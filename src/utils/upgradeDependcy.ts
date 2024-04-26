import { exit } from "process"
import { CommitType } from "../../src/constant"
import { getCommitMessage, getPackageUpgradeVersion, getVersionFromRequiredVersion, installDependcies, readPackageJson, writePackageJson } from "."
import { checkType } from "./checkType"

export async function upgradeDependency() {
    const { default: inquirer } = await import("inquirer")

    const packageJson = await readPackageJson()

    const { types } = await inquirer.prompt({
        type: "checkbox",
        name: "types",
        message: "请选择要升级的依赖类型",
        choices: ["dependencies", "devDependencies"].filter(type => !!packageJson[type])
    })

    const { level } = await inquirer.prompt({
        type: "list",
        name: "level",
        message: "请选择升级的级别",
        choices: ["major", "minor", "patch"]
    })

    const updateLogs: string[] = []

    for (const type of types) {
        const upgrades: { package: string; oldVersion: string; newVersion: string; strVersion: string }[] = []
        const allPkgs = Object.keys(packageJson[type])

        for (let i = 0; i < allPkgs.length; i++) {
            const pkg = allPkgs[i]
            const rv = packageJson[type][pkg]
            const s = rv.match(/^\D*/)![0]
            const cv = getVersionFromRequiredVersion(rv)
            const version = await getPackageUpgradeVersion(pkg, cv, level)
            if (!version) continue
            upgrades.push({ package: pkg, oldVersion: cv, newVersion: version, strVersion: `${s}${version}` })
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
