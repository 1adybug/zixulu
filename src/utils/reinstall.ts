import { spawnAsync } from "soda-nodejs"

export async function reinstall(name: string) {
    await spawnAsync(`yarn remove ${name}`, { shell: true, stdio: "inherit" })
    await spawnAsync(`yarn add ${name}`, { shell: true, stdio: "inherit" })
}
