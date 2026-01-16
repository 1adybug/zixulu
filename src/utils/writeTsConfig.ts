import { writeFile } from "node:fs/promises"

import { getTsConfigJsonPath } from "./getTsConfigPath"

export async function writeTsConfig(config: Record<string, unknown>) {
    return await writeFile(getTsConfigJsonPath(), JSON.stringify(config, undefined, 4), "utf-8")
}
