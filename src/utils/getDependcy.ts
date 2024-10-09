import { readPackageJson } from "./readPackageJson"

export async function getDependcy(name: string): Promise<string | undefined> {
    const packageJson = await readPackageJson()
    return (
        packageJson.dependencies?.[name] ||
        packageJson.devDependencies?.[name] ||
        packageJson.peerDependencies?.[name] ||
        packageJson.optionalDependencies?.[name]
    )
}
