import { stat } from "node:fs/promises"
import { resolve } from "node:path"

import consola from "consola"
import inquirer from "inquirer"
import { execAsync } from "soda-nodejs"

import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

export const SyncTemplateAction = {
    同步: "sync",
    新增: "add",
    删除: "delete",
    退出: "exit",
} as const

export type SyncTemplateAction = (typeof SyncTemplateAction)[keyof typeof SyncTemplateAction]

export interface SelectSyncTemplateActionAnswer {
    action: SyncTemplateAction
}

export interface AddTemplateProjectAnswer {
    projectPath: string
}

export interface DeleteTemplateProjectsAnswer {
    projectPaths: string[]
}

export interface SyncTemplateProjectParams {
    projectPath: string
    index: number
    total: number
}

export interface GetGitCommandErrorMessageParams {
    error: unknown
}

export interface RunGitCommandParams {
    cwd: string
    command: string
}

export interface CheckGitRefExistsParams {
    cwd: string
    ref: string
}

export interface CheckMergeConflictParams {
    cwd: string
    sourceBranch: string
}

export interface ResolveBranchCommitHashParams {
    cwd: string
    branch: string
}

export interface SyncTemplateProjectsParams {
    templateProjects: string[]
}

export interface CheckSyncProjectAvailableParams {
    projectPath: string
}

export interface CheckSyncProjectAvailableResult {
    isAvailable: boolean
    reason?: string
}

export interface ConfirmDeleteInvalidTemplateProjectParams {
    projectPath: string
    reason: string
}

export interface HasTemplateRemoteParams {
    cwd: string
}

export interface ConfirmDeleteInvalidTemplateProjectAnswer {
    shouldDelete: boolean
}

export interface PrintTemplateProjectsParams {
    templateProjects: string[]
}

export interface AddTemplateProjectsParams {
    templateProjects: string[]
}

export interface DeleteTemplateProjectsParams {
    templateProjects: string[]
}

export async function syncTemplate() {
    while (true) {
        const setting = await readZixuluSetting()
        const templateProjects = getTemplateProjects(setting.templateProjects)

        printTemplateProjects({ templateProjects })

        const action = await selectSyncTemplateAction()

        if (action === SyncTemplateAction.同步) {
            const nextTemplateProjects = await syncTemplateProjects({ templateProjects })
            setting.templateProjects = nextTemplateProjects
            await writeZixuluSetting(setting)
            return
        }

        if (action === SyncTemplateAction.新增) {
            const nextTemplateProjects = await addTemplateProjects({ templateProjects })
            setting.templateProjects = nextTemplateProjects
            await writeZixuluSetting(setting)
            continue
        }

        if (action === SyncTemplateAction.删除) {
            const nextTemplateProjects = await deleteTemplateProjects({ templateProjects })
            setting.templateProjects = nextTemplateProjects
            await writeZixuluSetting(setting)
            continue
        }

        return
    }
}

export function getTemplateProjects(templateProjects?: string[]) {
    if (!templateProjects) return []

    return Array.from(new Set(templateProjects.map(projectPath => projectPath.trim()).filter(projectPath => Boolean(projectPath))))
}

export function printTemplateProjects({ templateProjects }: PrintTemplateProjectsParams) {
    if (templateProjects.length === 0) {
        consola.info("当前没有模板项目")
        return
    }

    consola.info("当前模板项目列表")

    templateProjects.forEach((projectPath, index) => {
        consola.log(`${index + 1}. ${projectPath}`)
    })
}

export async function selectSyncTemplateAction() {
    const { action } = await inquirer.prompt<SelectSyncTemplateActionAnswer>({
        type: "list",
        name: "action",
        message: "请选择模板项目操作",
        choices: [
            {
                name: "同步",
                value: SyncTemplateAction.同步,
            },
            {
                name: "新增",
                value: SyncTemplateAction.新增,
            },
            {
                name: "删除",
                value: SyncTemplateAction.删除,
            },
            {
                name: "退出",
                value: SyncTemplateAction.退出,
            },
        ],
        default: SyncTemplateAction.同步,
    })

    return action
}

export async function addTemplateProjects({ templateProjects }: AddTemplateProjectsParams) {
    const templateProjectSet = new Set(templateProjects)

    while (true) {
        const { projectPath } = await inquirer.prompt<AddTemplateProjectAnswer>({
            type: "input",
            name: "projectPath",
            message: "请输入项目路径（留空结束新增）",
        })

        const inputPath = projectPath.trim()

        if (!inputPath) break

        const normalizedPath = resolve(inputPath)

        if (!(await isDirectory(normalizedPath))) {
            consola.error(`${normalizedPath} 不存在或不是目录`)
            continue
        }

        if (!(await isGitRepository(normalizedPath))) {
            consola.error(`${normalizedPath} 不是 git 仓库`)
            continue
        }

        if (!(await hasTemplateRemote({ cwd: normalizedPath }))) {
            consola.error(`${normalizedPath} 不存在远程 template 仓库`)
            continue
        }

        if (templateProjectSet.has(normalizedPath)) {
            consola.warn(`${normalizedPath} 已存在，已跳过`)
            continue
        }

        templateProjectSet.add(normalizedPath)
        consola.success(`已新增 ${normalizedPath}`)
    }

    return Array.from(templateProjectSet)
}

export async function deleteTemplateProjects({ templateProjects }: DeleteTemplateProjectsParams) {
    if (templateProjects.length === 0) {
        consola.info("当前没有可删除的模板项目")
        return templateProjects
    }

    const { projectPaths } = await inquirer.prompt<DeleteTemplateProjectsAnswer>({
        type: "checkbox",
        name: "projectPaths",
        message: "请选择要删除的项目",
        choices: templateProjects.map(projectPath => ({
            name: projectPath,
            value: projectPath,
        })),
    })

    if (projectPaths.length === 0) {
        consola.info("未选择任何项目")
        return templateProjects
    }

    const removeProjectPathSet = new Set(projectPaths)
    const nextTemplateProjects = templateProjects.filter(projectPath => !removeProjectPathSet.has(projectPath))

    consola.success(`已删除 ${projectPaths.length} 个项目`)

    return nextTemplateProjects
}

export async function syncTemplateProjects({ templateProjects }: SyncTemplateProjectsParams) {
    if (templateProjects.length === 0) {
        consola.info("没有可同步的模板项目")
        return templateProjects
    }

    const templateProjectSet = new Set(templateProjects)

    for (const [index, projectPath] of templateProjects.entries()) {
        const { isAvailable, reason } = await checkSyncProjectAvailable({ projectPath })

        if (!isAvailable) {
            const invalidReason = reason ?? "目录不可用"
            consola.warn(`[${index + 1}/${templateProjects.length}] 跳过 ${projectPath}，原因：${invalidReason}`)

            const shouldDelete = await confirmDeleteInvalidTemplateProject({
                projectPath,
                reason: invalidReason,
            })

            if (shouldDelete) {
                templateProjectSet.delete(projectPath)
                consola.success(`已从模板项目中删除 ${projectPath}`)
            }

            continue
        }

        await syncTemplateProject({
            projectPath,
            index: index + 1,
            total: templateProjects.length,
        })
    }

    consola.success("模板项目同步完成")

    return Array.from(templateProjectSet)
}

export async function checkSyncProjectAvailable({ projectPath }: CheckSyncProjectAvailableParams): Promise<CheckSyncProjectAvailableResult> {
    if (!(await isDirectory(projectPath))) {
        return {
            isAvailable: false,
            reason: "目录不存在或不是目录",
        }
    }

    if (!(await isGitRepository(projectPath))) {
        return {
            isAvailable: false,
            reason: "不是 git 仓库",
        }
    }

    if (!(await hasTemplateRemote({ cwd: projectPath }))) {
        return {
            isAvailable: false,
            reason: "不存在远程 template 仓库",
        }
    }

    return {
        isAvailable: true,
    }
}

export async function confirmDeleteInvalidTemplateProject({ projectPath, reason }: ConfirmDeleteInvalidTemplateProjectParams) {
    const { shouldDelete } = await inquirer.prompt<ConfirmDeleteInvalidTemplateProjectAnswer>({
        type: "confirm",
        name: "shouldDelete",
        message: `${projectPath}（${reason}），是否从 templateProjects 删除`,
        default: true,
    })

    return shouldDelete
}

export async function isGitRepository(cwd: string) {
    try {
        await runGitCommand({
            cwd,
            command: "git rev-parse --is-inside-work-tree",
        })
        return true
    } catch (error) {
        return false
    }
}

export async function hasTemplateRemote({ cwd }: HasTemplateRemoteParams) {
    try {
        const remote = await runGitCommand({
            cwd,
            command: "git remote get-url template",
        })

        return Boolean(remote.trim())
    } catch (error) {
        return false
    }
}

export async function syncTemplateProject({ projectPath, index, total }: SyncTemplateProjectParams) {
    consola.start(`[${index}/${total}] 开始同步 ${projectPath}`)

    try {
        if (!(await isDirectory(projectPath))) throw new Error("项目目录不存在")

        await ensureGitRepository(projectPath)
        await ensureNoGitChanges(projectPath)
        await runGitCommand({
            cwd: projectPath,
            command: "git fetch template",
        })

        const defaultBranch = await resolveDefaultBranch(projectPath)
        await runGitCommand({
            cwd: projectPath,
            command: `git checkout ${defaultBranch}`,
        })

        const templateBranch = await resolveTemplateBranch({
            cwd: projectPath,
            defaultBranch,
        })
        const templateCommitHash = await resolveBranchCommitHash({
            cwd: projectPath,
            branch: templateBranch,
        })

        const hasConflict = await checkMergeConflict({
            cwd: projectPath,
            sourceBranch: templateBranch,
        })

        if (hasConflict) throw new Error(`${defaultBranch} 与 ${templateBranch} 存在冲突，已跳过`)

        await runGitCommand({
            cwd: projectPath,
            command: `git merge --no-ff -m "Merge commit '${templateCommitHash}'" ${templateBranch}`,
        })

        await runGitCommand({
            cwd: projectPath,
            command: "git push",
        })

        consola.success(`[${index}/${total}] 同步成功 ${projectPath}`)
    } catch (error) {
        const errorMessage = getGitCommandErrorMessage({ error })
        consola.error(`[${index}/${total}] 同步失败 ${projectPath}`)
        consola.error(errorMessage)
    }
}

export async function ensureGitRepository(cwd: string) {
    await runGitCommand({
        cwd,
        command: "git rev-parse --is-inside-work-tree",
    })
}

export async function ensureNoGitChanges(cwd: string) {
    const status = await runGitCommand({
        cwd,
        command: "git status --porcelain",
    })

    if (status.trim()) throw new Error("工作区存在未提交的变更，请先处理后再同步")
}

export async function resolveDefaultBranch(cwd: string) {
    if (await checkGitRefExists({ cwd, ref: "refs/heads/main" })) return "main"

    if (await checkGitRefExists({ cwd, ref: "refs/heads/master" })) return "master"

    if (await checkGitRefExists({ cwd, ref: "refs/remotes/origin/main" })) {
        await runGitCommand({
            cwd,
            command: "git checkout -B main origin/main",
        })
        return "main"
    }

    if (await checkGitRefExists({ cwd, ref: "refs/remotes/origin/master" })) {
        await runGitCommand({
            cwd,
            command: "git checkout -B master origin/master",
        })
        return "master"
    }

    throw new Error("未找到 main 或 master 分支")
}

export interface ResolveTemplateBranchParams {
    cwd: string
    defaultBranch: string
}

export async function resolveTemplateBranch({ cwd, defaultBranch }: ResolveTemplateBranchParams) {
    const firstBranch = `refs/remotes/template/${defaultBranch}`

    if (await checkGitRefExists({ cwd, ref: firstBranch })) return `template/${defaultBranch}`

    const fallbackBranch = defaultBranch === "main" ? "master" : "main"
    const secondBranch = `refs/remotes/template/${fallbackBranch}`

    if (await checkGitRefExists({ cwd, ref: secondBranch })) return `template/${fallbackBranch}`

    throw new Error("template 远程不存在 main 或 master 分支")
}

export async function checkMergeConflict({ cwd, sourceBranch }: CheckMergeConflictParams) {
    try {
        await runGitCommand({
            cwd,
            command: `git merge --no-commit --no-ff ${sourceBranch}`,
        })
    } catch (error) {
        await abortMergeIfNeeded(cwd)
        return true
    }

    await abortMergeIfNeeded(cwd)
    return false
}

export async function resolveBranchCommitHash({ cwd, branch }: ResolveBranchCommitHashParams) {
    const hash = await runGitCommand({
        cwd,
        command: `git rev-parse ${branch}`,
    })

    const trimmedHash = hash.trim()

    if (!trimmedHash) throw new Error(`无法获取分支 ${branch} 的提交 hash`)

    return trimmedHash
}

export async function abortMergeIfNeeded(cwd: string) {
    if (!(await isMergeInProgress(cwd))) return

    await runGitCommand({
        cwd,
        command: "git merge --abort",
    })
}

export async function isMergeInProgress(cwd: string) {
    try {
        await runGitCommand({
            cwd,
            command: "git rev-parse -q --verify MERGE_HEAD",
        })
        return true
    } catch (error) {
        return false
    }
}

export async function runGitCommand({ cwd, command }: RunGitCommandParams) {
    return await execAsync(command, { cwd })
}

export async function checkGitRefExists({ cwd, ref }: CheckGitRefExistsParams) {
    try {
        await runGitCommand({
            cwd,
            command: `git show-ref --verify --quiet ${ref}`,
        })
        return true
    } catch (error) {
        return false
    }
}

export async function isDirectory(projectPath: string) {
    try {
        const projectStat = await stat(projectPath)
        return projectStat.isDirectory()
    } catch (error) {
        return false
    }
}

export function getGitCommandErrorMessage({ error }: GetGitCommandErrorMessageParams) {
    if (error instanceof Error && error.message) return error.message
    return "未知错误"
}
