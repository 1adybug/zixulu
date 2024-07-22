import { spawnAsync } from "soda-nodejs"

export async function checkType() {
    await spawnAsync("npx tsc --noEmit", { shell: true, stdio: "inherit" })
}
