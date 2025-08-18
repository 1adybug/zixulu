import { writeFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import { stringify, JsonMap } from "@iarna/toml"

export async function writeBunConfig(config: JsonMap) {
    const path = join(homedir(), ".bunfig.toml")
    await writeFile(path, stringify(config), "utf-8")
}
