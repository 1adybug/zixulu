import { join } from "path"
import { cwd } from "process"

export function getTsConfigJsonPath(path?: string) {
    return join(path ?? cwd(), "tsconfig.json")
}
