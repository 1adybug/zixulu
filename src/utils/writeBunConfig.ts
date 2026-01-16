import { writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import { JsonMap, stringify } from "@iarna/toml"

export async function writeBunConfig(config: JsonMap) {
    const path = join(homedir(), ".bunfig.toml")
    await writeFile(path, stringify(config), "utf-8")
}
