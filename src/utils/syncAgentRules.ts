import { existsSync } from "node:fs"
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import inquirer from "inquirer"
import { spawnAsync } from "soda-nodejs"

import { CommitType } from "@/constant"

import { getCommitMessage } from "./getCommitMessage"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export const AgentRulesSyncTarget = {
    agentsMd: "AGENTS.md",
    cursor: "Cursor",
    antiGravity: "AntiGravity",
} as const

export type AgentRulesSyncTarget = (typeof AgentRulesSyncTarget)[keyof typeof AgentRulesSyncTarget]

export interface SyncAgentRulesAnswer {
    targets: AgentRulesSyncTarget[]
}

export interface SelectCursorRulesAnswer {
    files: string[]
}

export interface AgentRuleFileStatusMap {
    [filename: string]: string
}

const source = join(".cursor-rules")
const cursorRulesTarget = join(".cursor", "rules")
const antiGravityRulesTarget = join(".agent", "rules")

const orders = ["base.mdc", "react.mdc", "api.mdc", "next.mdc"]

/** 获取默认同步目标 */
export function getDefaultSyncTargets() {
    const targets: AgentRulesSyncTarget[] = []

    if (existsSync("AGENTS.md")) targets.push(AgentRulesSyncTarget.agentsMd)
    if (existsSync(".cursor")) targets.push(AgentRulesSyncTarget.cursor)
    if (existsSync(".agent")) targets.push(AgentRulesSyncTarget.antiGravity)

    return targets
}

/** 根据固定顺序排序规则文件 */
export function sortAgentRuleFiles(files: string[]) {
    return files.toSorted((a, b) => {
        const aIndex = orders.indexOf(a)
        const bIndex = orders.indexOf(b)

        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1

        return aIndex - bIndex
    })
}

/** 将 Cursor 规则转换为 AntiGravity 规则 */
export function transformCursorRuleToAntiGravityRule(source: string) {
    return source.replace(
        /^---\nalwaysApply: (true|false)\n---/,
        (match, p1) => `---
trigger: ${p1 === "true" ? "always_on" : "model_decision"}
glob:
description:
---`,
    )
}

/** 将 Cursor 规则转换为 AGENTS.md 内容 */
export function transformCursorRuleToAgentsRule(source: string) {
    return source.replace(/^---\nalwaysApply: (true|false)\n---/, "").replace(/^(#+ )/gm, "#$1")
}

/** 获取 Cursor 规则文件状态 */
export async function getCursorRuleFileStatusMap(files: string[]) {
    const map: AgentRuleFileStatusMap = {}

    if (!existsSync(cursorRulesTarget)) return Object.fromEntries(files.map(file => [file, "new"]))

    const targetDir = await readdir(cursorRulesTarget)

    for (const file of files) {
        if (!targetDir.includes(file)) {
            map[file] = "new"
            continue
        }

        const sourceContent = await readFile(join(source, file), "utf-8")
        const targetContent = await readFile(join(cursorRulesTarget, file), "utf-8")
        if (sourceContent === targetContent) continue
        map[file] = "modified"
    }

    return map
}

/** 同步 Cursor 规则 */
export async function syncCursorRules(files: string[]) {
    const map = await getCursorRuleFileStatusMap(files)
    const changedFiles = Object.keys(map)

    if (changedFiles.length === 0) return

    const { files: selectedFiles } = await inquirer.prompt<SelectCursorRulesAnswer>({
        type: "checkbox",
        name: "files",
        message: "请选择要添加的 Cursor 规则文件",
        choices: Object.entries(map).map(([key, value]) => ({
            name: `${key} (${value})`,
            value: key,
        })),
        default: changedFiles,
    })

    await mkdir(cursorRulesTarget, { recursive: true })

    for (const file of selectedFiles) await copyFile(join(source, file), join(cursorRulesTarget, file))
}

/** 同步 AntiGravity 规则 */
export async function syncAntiGravityRules(files: string[]) {
    await mkdir(antiGravityRulesTarget, { recursive: true })

    for (const file of files) {
        const sourceContent = await readFile(join(source, file), "utf-8")
        const content = transformCursorRuleToAntiGravityRule(sourceContent)

        await writeFile(join(antiGravityRulesTarget, file.replace(/\.mdc$/, ".md")), content)
    }
}

/** 同步 AGENTS.md 规则 */
export async function syncAgentsMdRules(files: string[]) {
    let agentsRule = "# Agent Rules"

    for (const file of files) {
        const sourceContent = await readFile(join(source, file), "utf-8")
        const content = transformCursorRuleToAgentsRule(sourceContent)

        agentsRule = `${agentsRule}${content}`.replace(/\n+$/, "")
    }

    agentsRule = `${agentsRule}\n`

    await writeFile("AGENTS.md", agentsRule)
}

export async function asyncAgentRules() {
    try {
        const packageJson = await readPackageJson()
        if (packageJson?.scripts?.ucr === "npx zixulu acr") packageJson.scripts.ucr = undefined
        await writePackageJson({ data: packageJson })
    } catch (error) {}

    await spawnAsync(`npx gitpick 1adybug/cursor-rule/tree/main/.cursor/rules .cursor-rules`)

    try {
        const sourceDir = sortAgentRuleFiles(await readdir(source))
        const defaultTargets = getDefaultSyncTargets()

        const { targets } = await inquirer.prompt<SyncAgentRulesAnswer>({
            type: "checkbox",
            name: "targets",
            message: "请选择要同步的 Agent 规则",
            choices: Object.values(AgentRulesSyncTarget),
            default: defaultTargets,
        })

        if (targets.length === 0) throw new Error("未选择同步目标")

        if (targets.includes(AgentRulesSyncTarget.cursor)) await syncCursorRules(sourceDir)
        if (targets.includes(AgentRulesSyncTarget.antiGravity)) await syncAntiGravityRules(sourceDir)
        if (targets.includes(AgentRulesSyncTarget.agentsMd)) await syncAgentsMdRules(sourceDir)

        await rm(source, { recursive: true, force: true })

        return getCommitMessage(CommitType.feature, `同步 Agent 规则`)
    } catch (error) {
        await rm(source, { recursive: true, force: true })
        throw error
    }
}
