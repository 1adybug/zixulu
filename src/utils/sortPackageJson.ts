import consola from "consola"
import { readPackageJson, sortArrayOrObject, writePackageJson } from "."

export async function sortPackageJson() {
    consola.start("开始排序 package.json 中的依赖")
    const packageJson = await readPackageJson()
    packageJson.dependencies = sortArrayOrObject(packageJson.dependencies)
    packageJson.devDependencies = sortArrayOrObject(packageJson.devDependencies)
    packageJson.peerDependencies = sortArrayOrObject(packageJson.peerDependencies)
    packageJson.peerDevDependencies = sortArrayOrObject(packageJson.peerDevDependencies)
    await writePackageJson(packageJson)
    consola.success("排序 package.json 中的依赖成功")
}
