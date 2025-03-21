import { writeFile } from "fs/promises"

import { getTsConfigJsonPath } from "./getTsConfigPath"

export async function writeTsConfig(config: any) {
    return await writeFile(getTsConfigJsonPath(), JSON.stringify(config, undefined, 4), "utf-8")
}
