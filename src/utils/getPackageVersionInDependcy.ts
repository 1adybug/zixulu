import { readPackageJson } from "./readPackageJson"

export async function getPackageVersionInDependcy(packageName: string) {
    const packageJson = await readPackageJson()
    let version = packageJson.dependencies?.[packageName] ?? packageJson.devDependencies?.[packageName] ?? packageJson.peerDependencies?.[packageName] ?? packageJson.optionalDependencies?.[packageName]
    if (!version) return undefined
    return version.replace(/^\D+/, "")
}
