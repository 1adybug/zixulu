import { execAsync } from "soda-nodejs"

export async function isRepository() {
    try {
        await execAsync("git status")
        return true
    } catch {
        return false
    }
}
