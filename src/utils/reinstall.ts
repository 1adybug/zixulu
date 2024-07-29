import { rm } from "fs/promises"
import { getPackageManager } from "./getPackageManager"
import { installDependceny } from "./installDependceny"

export async function reinstall() {
    const manager = await getPackageManager()
    await rm("node_modules", { recursive: true, force: true })
    await rm("pnpm-lock.yaml", { force: true })
    await rm("yarn.lock", { force: true })
    await rm("package-lock.json", { force: true })
    await installDependceny({ manager, silent: true })
}
