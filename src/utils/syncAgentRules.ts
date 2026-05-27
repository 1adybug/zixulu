import { access, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import inquirer from "inquirer"
import { spawnAsync } from "soda-nodejs"

import { CommitType } from "@/constant"

import { getCommitMessage } from "./getCommitMessage"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

/** 规则文件 */
export interface AgentRuleFile {
    filename: string
    title: string
    content: string
}

/** 选择规则文件的回答 */
export interface SelectAgentRulesAnswer {
    files: string[]
}

/** 获取默认规则文件的参数 */
export interface GetDefaultAgentRuleFilesParams {
    rules: AgentRuleFile[]
    originalContent?: string
}

/** 选择规则文件的参数 */
export interface SelectAgentRuleFilesParams {
    rules: AgentRuleFile[]
    defaultFiles: string[]
}

const source = join(".agent-rules")
const agentsMdTarget = "AGENTS.md"

const orders = ["base.md", "style.md", "react.md", "api.md", "next.md"]

/** 判断路径是否存在 */
export async function pathExists(path: string) {
    try {
        await access(path)
        return true
    } catch {
        return false
    }
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

/** 标准化标题用于匹配 */
export function normalizeMarkdownHeading(heading: string) {
    return heading
        .replace(/\s+#+$/, "")
        .trim()
        .toLocaleLowerCase()
}

/** 获取 Markdown 标题 */
export function getMarkdownHeadings(content: string, level: number) {
    const hashes = "#".repeat(level)
    const regexp = new RegExp(`^${hashes}(?!#)\\s+(.+?)\\s*$`, "gm")

    return Array.from(content.matchAll(regexp), ([, heading]) => heading.replace(/\s+#+$/, "").trim())
}

/** 获取 Markdown 一级标题 */
export function getMarkdownFirstHeading(content: string) {
    return getMarkdownHeadings(content, 1)[0] ?? ""
}

/** 将远程 Markdown 规则转换为 AGENTS.md 内容 */
export function transformMarkdownRuleToAgentsRule(source: string) {
    return source.replace(/^(#+ )/gm, "#$1").replace(/\n+$/, "")
}

/** 获取远程根目录中的 Markdown 规则文件名 */
export async function getMarkdownRuleFilenames() {
    const entries = await readdir(source, { withFileTypes: true })

    return sortAgentRuleFiles(
        entries
            .filter(entry => entry.isFile())
            .map(entry => entry.name)
            .filter(filename => filename.toLowerCase().endsWith(".md")),
    )
}

/** 读取远程规则文件 */
export async function readAgentRuleFiles(files: string[]) {
    const rules: AgentRuleFile[] = []

    for (const filename of files) {
        const content = await readFile(join(source, filename), "utf-8")
        const title = getMarkdownFirstHeading(content) || filename

        rules.push({ filename, title, content })
    }

    return rules
}

/** 读取原始 AGENTS.md */
export async function readOriginalAgentsMd() {
    if (!(await pathExists(agentsMdTarget))) return

    return await readFile(agentsMdTarget, "utf-8")
}

/** 获取默认勾选的规则文件 */
export function getDefaultAgentRuleFiles(params: GetDefaultAgentRuleFilesParams) {
    const { rules, originalContent } = params

    if (!originalContent) return rules.map(rule => rule.filename)

    const originalSecondHeadings = new Set(getMarkdownHeadings(originalContent, 2).map(normalizeMarkdownHeading))

    return rules.filter(rule => originalSecondHeadings.has(normalizeMarkdownHeading(rule.title))).map(rule => rule.filename)
}

/** 选择要同步的规则文件 */
export async function selectAgentRuleFiles(params: SelectAgentRuleFilesParams) {
    const { rules, defaultFiles } = params
    const { files } = await inquirer.prompt<SelectAgentRulesAnswer>({
        type: "checkbox",
        name: "files",
        message: "请选择要同步到 AGENTS.md 的规则",
        choices: rules.map(rule => ({
            name: `${rule.title} (${rule.filename})`,
            value: rule.filename,
        })),
        default: defaultFiles,
    })

    return files
}

/** 同步 AGENTS.md 规则 */
export async function syncAgentsMdRules(rules: AgentRuleFile[]) {
    const sections = rules.map(rule => transformMarkdownRuleToAgentsRule(rule.content)).filter(Boolean)
    const agentsRule = `${["# Agent Rules", ...sections].join("\n\n").replace(/\n+$/, "")}\n`

    await writeFile(agentsMdTarget, agentsRule)
}

export async function asyncAgentRules() {
    try {
        const packageJson = await readPackageJson()
        if (packageJson?.scripts?.ucr === "npx zixulu acr") packageJson.scripts.ucr = undefined
        await writePackageJson({ data: packageJson })
    } catch {}

    await rm(source, { recursive: true, force: true })

    try {
        await spawnAsync(`npx gitpick 1adybug/cursor-rule ${source}`)

        const sourceDir = await getMarkdownRuleFilenames()
        if (sourceDir.length === 0) throw new Error("未找到 Agent 规则文件")

        const rules = await readAgentRuleFiles(sourceDir)
        const originalAgentsMd = await readOriginalAgentsMd()
        const defaultFiles = getDefaultAgentRuleFiles({ rules, originalContent: originalAgentsMd })
        const selectedFiles = await selectAgentRuleFiles({ rules, defaultFiles })

        if (selectedFiles.length === 0) throw new Error("未选择 Agent 规则")

        await syncAgentsMdRules(rules.filter(rule => selectedFiles.includes(rule.filename)))

        return getCommitMessage(CommitType.feat, `sync agent rule`)
    } finally {
        await rm(source, { recursive: true, force: true })
    }
}
