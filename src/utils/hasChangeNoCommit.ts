import { execAsync } from "."

export async function hasChangeNoCommit(cwd?: string) {
    const status = await execAsync("git status", { cwd })
    return !status.includes("nothing to commit, working tree clean")
}
