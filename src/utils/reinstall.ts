import { spawnAsync } from "."

export async function reinstall(name: string) {
    await spawnAsync(`yarn remove ${name}`)
    await spawnAsync(`yarn add ${name}`)
}