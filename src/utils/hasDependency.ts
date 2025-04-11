import { readPackageJson } from "./readPackageJson"

export async function hasDependency(dependency: string | RegExp, dir?: string) {
    const packageJson = await readPackageJson(dir)
    const dependencies = packageJson.dependencies ?? {}
    const devDependencies = packageJson.devDependencies ?? {}
    const peerDependencies = packageJson.peerDependencies ?? {}
    const total = Object.keys({ ...dependencies, ...devDependencies, ...peerDependencies })
    return total.some(item => (typeof dependency === "string" ? item === dependency : dependency.test(item)))
}
