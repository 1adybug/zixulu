import { spawnAsync } from "soda-nodejs"

export async function winget() {
    const args = ["update", "--accept-package-agreements", "--accept-source-agreements", "--all"]
    if (global.__ZIXULU_PROXY__) args.push("--proxy", "http://127.0.0.1:7890")
    spawnAsync("winget", args)
}
