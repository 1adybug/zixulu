import { spawnAsync } from "soda-nodejs"

export type WingetParams = {
    proxy?: string
}

export async function winget({ proxy }: WingetParams) {
    const args = ["install", "--source", "https://winget.azureedge.net/cache", "--accept-package-agreements", "--accept-source-agreements"]
    if (proxy) args.push("--proxy", "http://127.0.0.1:7890")
    spawnAsync("winget", args)
}
