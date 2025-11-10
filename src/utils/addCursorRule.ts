import { existsSync } from "fs"
import { copyFile, mkdir, readdir, rm } from "fs/promises"
import { join } from "path"

import { spawnAsync } from "soda-nodejs"
import { CommitType } from "src/constant"

import { getCommitMessage } from "./getCommitMessage"

export async function addCursorRule() {
    await spawnAsync(`npx gitpick 1adybug/cursor-rule`)
    const source = join("cursor-rule", ".cursor", "rules")
    const target = join(".cursor", "rules")

    let existed = existsSync(target)

    if (!existed) {
        await mkdir(target, { recursive: true })
    }

    const dir = await readdir(source)

    for (const file of dir) {
        await copyFile(join(source, file), join(target, file))
    }

    await rm("cursor-rule", { recursive: true })

    return getCommitMessage(
        CommitType.feature,
        `${existed ? "更新" : "添加"} cursor 规则`,
    )
}
