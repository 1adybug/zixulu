import { existsSync } from "fs"
import { readFile, rename, writeFile } from "fs/promises"
import { homedir } from "os"
import { join, parse } from "path"
import consola from "consola"

import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

export type Editor = "Code" | "Cursor"

export type SyncEditorSettingSource = Editor | "Online"

export type FileType = "settings" | "snippets"

export type FileSourceMap = Record<FileType, Record<SyncEditorSettingSource, string>>

const userDir = homedir()

const fileSourceMap: FileSourceMap = {
    settings: {
        Code: join(userDir, "AppData/Roaming/Code/User/settings.json"),
        Cursor: join(userDir, "AppData/Roaming/Cursor/User/settings.json"),
        Online: "https://luzixu.geskj.com/settings.json",
    },
    snippets: {
        Code: join(userDir, "AppData/Roaming/Code/User/snippets/global.code-snippets"),
        Cursor: join(userDir, "AppData/Roaming/Cursor/User/snippets/global.code-snippets"),
        Online: "https://luzixu.geskj.com/global.code-snippets",
    },
}

export interface SyncEditorSettingParams {
    source: SyncEditorSettingSource
    target: Editor
}

export interface SyncEditorFileParams {
    source: string
    target: string
}

async function getFile(source: string) {
    if (source.startsWith("http")) {
        const response = await fetch(source)
        return await response.text()
    }
    return await readFile(source, "utf-8")
}

export async function syncEditorFile({ source, target }: SyncEditorFileParams) {
    const { dir, base } = parse(target)
    let setting = await readZixuluSetting()
    const code = await getFile(source)
    if (existsSync(target)) {
        const text = await readFile(target, "utf-8")
        if (text === code) {
            consola.success(`${target} 已是最新`)
            return
        } else {
            const { default: inquirer } = await import("inquirer")
            type Answer = { backup: boolean }
            const { backup } = await inquirer.prompt<Answer>({
                type: "confirm",
                name: "backup",
                message: `是否备份原文件（${target}）`,
                default: setting.syncEditor?.fileConfigs?.[target]?.backup ?? true,
            })
            setting.syncEditor ??= {}
            setting.syncEditor.fileConfigs ??= {}
            setting.syncEditor.fileConfigs[target] ??= {}
            setting.syncEditor.fileConfigs[target].backup = backup
            await writeZixuluSetting(setting)
            if (backup) await rename(target, join(dir, `${base}.${Date.now()}.bak`))
        }
    }
    await writeFile(target, code, "utf-8")
    consola.success(`${target} 同步完成`)
}

export async function syncEditorSetting() {
    let setting = await readZixuluSetting()
    const { default: inquirer } = await import("inquirer")

    interface Answer {
        source: SyncEditorSettingSource
        fileTypes: FileType[]
        targets: Editor[]
    }

    const { source } = await inquirer.prompt<Answer>([
        {
            type: "list",
            name: "source",
            message: "选择同步来源",
            choices: ["Code", "Cursor", "Online"],
            default: setting.syncEditor?.source ?? "Cursor",
        },
    ])

    setting.syncEditor ??= {}
    setting.syncEditor.source = source

    const { targets, fileTypes } = await inquirer.prompt<Answer>([
        {
            type: "checkbox",
            name: "targets",
            message: "选择同步目标",
            choices: ["Code", "Cursor"].filter(v => v !== source),
            default: (setting.syncEditor?.targets ?? ["Code", "Cursor"]).filter(v => v !== source),
        },
        {
            type: "checkbox",
            name: "fileTypes",
            message: "选择同步文件类型",
            choices: ["settings", "snippets"],
            default: setting.syncEditor?.fileTypes ?? ["settings", "snippets"],
        },
    ])

    setting.syncEditor.targets = targets
    setting.syncEditor.fileTypes = fileTypes

    await writeZixuluSetting(setting)

    const configs: SyncEditorFileParams[] = fileTypes
        .map(fileType =>
            targets.map(target => ({
                source: fileSourceMap[fileType][source],
                target: fileSourceMap[fileType][target],
            })),
        )
        .flat()

    for (const config of configs) {
        await syncEditorFile(config)
    }
}
