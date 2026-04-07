import { resolve } from "node:path"

import consola from "consola"
import inquirer from "inquirer"
import { execAsync } from "soda-nodejs"

import { isRepository } from "./isRepository"
import { readZixuluSetting } from "./readZixuluSetting"
import { getTemplateProjects, hasTemplateRemote } from "./syncTemplate"
import { writeZixuluSetting } from "./writeZixuluSetting"

/** 模板远程名称 */
export const TemplateRemoteName = "template"

/** 模板远程推送地址 */
export const TemplatePushUrl = "no_push://template"

/** 模板远程输入结果 */
export interface InputTemplateRemoteAnswer {
    /** 模板远程地址 */
    templateRemote: string
}

/** 配置模板远程参数 */
export interface SetupTemplateRemoteParams {
    /** 模板远程地址 */
    templateRemote: string
}

export async function addTemplate() {
    if (!(await isRepository())) throw new Error("当前目录不是 Git 仓库")

    const templateRemote = await inputTemplateRemote()

    await setupTemplateRemote({ templateRemote })
    await addCurrentProjectToTemplateProjects()

    consola.success("模板远程配置成功")
    consola.info(`当前仓库已添加到 templateProjects，push 地址已设置为 ${TemplatePushUrl}`)
}

export async function inputTemplateRemote() {
    const currentTemplateRemote = await getTemplateRemoteUrl()

    const { templateRemote } = await inquirer.prompt<InputTemplateRemoteAnswer>({
        type: "input",
        name: "templateRemote",
        message: "请输入模板远程仓库链接",
        default: currentTemplateRemote,
        validate(value) {
            if (!value.trim()) return "模板远程仓库链接不能为空"
            return true
        },
    })

    return templateRemote.trim()
}

export async function getTemplateRemoteUrl() {
    try {
        const remoteUrl = await execAsync(`git remote get-url ${TemplateRemoteName}`)
        const normalizedRemoteUrl = remoteUrl.trim()

        if (!normalizedRemoteUrl) return

        return normalizedRemoteUrl
    } catch {
        return
    }
}

export async function setupTemplateRemote({ templateRemote }: SetupTemplateRemoteParams) {
    const escapedTemplateRemote = escapeDoubleQuote(templateRemote)
    const escapedTemplatePushUrl = escapeDoubleQuote(TemplatePushUrl)

    if (await hasTemplateRemote({ cwd: process.cwd() })) await execAsync(`git remote set-url ${TemplateRemoteName} "${escapedTemplateRemote}"`)
    else await execAsync(`git remote add ${TemplateRemoteName} "${escapedTemplateRemote}"`)

    await execAsync(`git remote set-url --push ${TemplateRemoteName} "${escapedTemplatePushUrl}"`)
}

export async function addCurrentProjectToTemplateProjects() {
    const currentProjectPath = resolve(process.cwd())
    const setting = await readZixuluSetting()
    const templateProjects = getTemplateProjects([...(setting.templateProjects ?? []), currentProjectPath])

    setting.templateProjects = templateProjects
    await writeZixuluSetting(setting)
}

export function escapeDoubleQuote(value: string) {
    return value.replaceAll('"', '\\"')
}
