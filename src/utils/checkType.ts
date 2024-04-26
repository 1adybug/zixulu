import { spawnAsync } from "."

export async function checkType() {
    await spawnAsync("npx tsc --noEmit")
}
