import { execAsync } from "soda-nodejs"

import { readZixuluCache } from "./readZixuluCache"
import { removeZixuluCache } from "./removeZixuluCache"
import { writeZixuluCache } from "./writeZixuluCache"

export async function sudoCommand() {
    try {
        const cache = await readZixuluCache()
        if (cache.sudoRequested) throw new Error("请在 sudo 下运行")
        cache.sudoRequested = true
        await writeZixuluCache(cache)
        await execAsync(`sudo env "PATH=$PATH" npx zixulu ${process.argv.slice(2).join(" ")}`)
    } finally {
        await removeZixuluCache()
    }
}
