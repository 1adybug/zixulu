import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import { parse } from "@iarna/toml"

export async function readBunConfig() {
    const path = join(homedir(), ".bunfig.toml")
    if (existsSync(path) === false) return {}
    const str = await readFile(join(homedir(), ".bunfig.toml"), "utf-8")

    return parse(str) as any
}
