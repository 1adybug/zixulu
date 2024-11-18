import { readdir, rename } from "fs/promises"
import { getPackageVersionInDependcy } from "./getPackageVersionInDependcy"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export async function tailwindPatch() {
    const version = await getPackageVersionInDependcy("tailwindcss")
    if (!version) return
    const dir = await readdir("./patches")
    const patch = dir.find(item => item.startsWith("tailwindcss"))
    if (!patch || patch === `tailwindcss@${version}.patch`) return
    await rename(`./patches/${patch}`, `./patches/tailwindcss@${version}.patch`)
    const packageJson = await readPackageJson()
    packageJson.patchedDependencies ??= {}
    delete packageJson.patchedDependencies[patch.replace(/\.patch$/, "")]
    packageJson.patchedDependencies[`tailwindcss@${version}`] = `patches/tailwindcss@${version}.patch`
    await writePackageJson({ data: packageJson })
    await installDependceny()
}
