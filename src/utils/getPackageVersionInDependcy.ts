import { readPackageJson } from "./readPackageJson"

export async function getPackageVersionInDependcy(packageName: string, dir = "."): Promise<string | undefined> {
    const packageJson = await readPackageJson(dir)
    let version =
        packageJson.dependencies?.[packageName] ??
        packageJson.devDependencies?.[packageName] ??
        packageJson.peerDependencies?.[packageName] ??
        packageJson.optionalDependencies?.[packageName]
    if (!version) return undefined
    return version.replace(/^\D+/, "")
}
