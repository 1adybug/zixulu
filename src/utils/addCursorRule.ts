import { existsSync } from "fs"
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"

import inquirer from "inquirer"
import { parse, stringify } from "smol-toml"
import { spawnAsync } from "soda-nodejs"

import { CommitType } from "@/constant"

import { getCommitMessage } from "./getCommitMessage"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export async function addCursorRule() {
    try {
        const packageJson = await readPackageJson()
        packageJson.scripts ??= {}
        packageJson.scripts.ucr = "npx zixulu acr"
        await writePackageJson({ data: packageJson })
    } catch (error) {}

    await spawnAsync(`npx gitpick 1adybug/cursor-rule/tree/main/.cursor/rules .cursor-rules`)

    const source = join(".cursor-rules")

    const target = join(".cursor", "rules")

    let existed = existsSync(target)

    if (!existed) await mkdir(target, { recursive: true })

    try {
        const sourceDir = await readdir(source)
        const targetDir = await readdir(target)

        const codexConfig = join(homedir(), ".codex", "config.toml")

        if (existsSync(codexConfig)) {
            const config = parse(await readFile(codexConfig, "utf-8"))
            config.project_doc_fallback_filenames = sourceDir.map(item => join(".cursor", "rules", item))
            if (typeof config.project_doc_max_bytes === "number" && config.project_doc_max_bytes < 65536) config.project_doc_max_bytes = 65536
            await writeFile(codexConfig, stringify(config))
        }

        const map: Record<string, string> = {}

        for (const file of sourceDir) {
            if (!targetDir.includes(file)) {
                map[file] = "new"
                continue
            }

            const sourceContent = await readFile(join(source, file), "utf-8")
            const targetContent = await readFile(join(target, file), "utf-8")
            if (sourceContent === targetContent) continue
            map[file] = "modified"
        }

        if (Object.keys(map).length === 0) throw new Error("cursor 规则已是最新")

        interface Answer {
            files: string[]
        }

        const { files } = await inquirer.prompt<Answer>({
            type: "checkbox",
            name: "files",
            message: "请选择要添加的文件",
            choices: Object.entries(map).map(([key, value]) => ({
                name: `${key} (${value})`,
                value: key,
            })),
            default: Object.keys(map),
        })

        for (const file of files) await copyFile(join(source, file), join(target, file))

        await rm(source, { recursive: true })

        const dir = await readdir(".cursor/rules")

        await mkdir(".agent/rules", { recursive: true })

        for (const file of dir) {
            const content = (await readFile(join(".cursor/rules", file), "utf-8")).replace(
                /^---\nalwaysApply: (true|false)\n---/,
                (match, p1) => `---
trigger: ${p1 === "true" ? "always_on" : "model_decision"}
glob:
description:
---`,
            )

            await writeFile(join(".agent/rules", file.replace(/\.mdc$/, ".md")), content)
        }

        return getCommitMessage(CommitType.feature, `${existed ? "更新" : "添加"} cursor 规则`)
    } catch (error) {
        await rm(source, { recursive: true })
        throw error
    }
}
