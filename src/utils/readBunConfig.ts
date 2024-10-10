import { parse } from "@iarna/toml"
import { existsSync } from "fs"
import { readFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

export async function readBunConfig() {
    const path = join(homedir(), ".bunfig.toml")
    if (existsSync(path) === false) return {}
    const str = await readFile(join(homedir(), ".bunfig.toml"), "utf-8")
    return parse(str) as any
}
