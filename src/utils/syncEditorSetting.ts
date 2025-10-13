import { existsSync } from "fs"
import { readFile, rename, writeFile } from "fs/promises"
import { homedir } from "os"
import { join, parse } from "path"
import consola from "consola"
import inquirer from "inquirer"
import { execAsync } from "soda-nodejs"

import { CommitType } from "@src/constant"

import { addGitCommit } from "./addGitCommit"
import { getCommitMessage } from "./getCommitMessage"
import { getEditorExtensions } from "./getEditorExtensions"
import { hasChangeNoCommit } from "./hasChangeNoCommit"
import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

export type Editor = "Code" | "Cursor"

export type SyncEditorSettingSource = Editor | "Online"

export type EditorFileType = "settings" | "snippets"

export type EditorConfigType = EditorFileType | "extensions"

export type EditorFileSourceMap = Record<EditorFileType, Record<SyncEditorSettingSource, string>>

const userDir = homedir()

const fileSourceMap: EditorFileSourceMap = {
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
    const setting = await readZixuluSetting()
    const code = await getFile(source)
    if (existsSync(target)) {
        const text = await readFile(target, "utf-8")
        if (text === code) {
            consola.success(`${target} 已是最新`)
            return
        } else {
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
    const setting = await readZixuluSetting()

    interface Answer {
        source: SyncEditorSettingSource
        types: EditorConfigType[]
        targets: SyncEditorSettingSource[]
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

    const { targets, types } = await inquirer.prompt<Answer>([
        {
            type: "checkbox",
            name: "targets",
            message: "选择同步目标",
            choices: ["Code", "Cursor", "Online"].filter(v => v !== source),
            default: (setting.syncEditor?.targets ?? ["Code", "Cursor", "Online"]).filter(v => v !== source),
        },
        {
            type: "checkbox",
            name: "types",
            message: "选择的配置类型",
            choices: ["settings", "snippets", "extensions"],
            default: setting.syncEditor?.types ?? ["settings", "snippets", "extensions"],
        },
    ])

    setting.syncEditor.targets = targets
    setting.syncEditor.types = types

    if (targets.includes("Online")) {
        interface Answer {
            onlinePath: string
        }

        const { onlinePath } = await inquirer.prompt<Answer>({
            type: "input",
            name: "onlinePath",
            message: "请输入 blog 文件夹的路径",
            default: setting.syncEditor?.onlinePath ?? "C:\\Users\\lenovo\\Desktop\\workspace\\blog",
        })

        setting.syncEditor.onlinePath = onlinePath
    }

    const onlinePath = setting.syncEditor.onlinePath!

    const configs: SyncEditorFileParams[] = types
        .filter(item => item !== "extensions")
        .map(fileType =>
            targets.map(target => ({
                source: fileSourceMap[fileType][source],
                target:
                    target === "Online"
                        ? join(onlinePath, "static", fileType === "settings" ? "settings.json" : "global.code-snippets")
                        : fileSourceMap[fileType][target],
            })),
        )
        .flat()

    for (const config of configs) {
        await syncEditorFile(config)
    }

    if (types.includes("extensions")) {
        const vscodeExtensions = await getEditorExtensions({ source: "Code" })
        const cursorExtensions = await getEditorExtensions({ source: "Cursor" })
        const onlineExtensions = await getEditorExtensions({ source: "Online" })

        const sourceExtensions = source === "Code" ? vscodeExtensions : source === "Cursor" ? cursorExtensions : onlineExtensions

        if (targets.includes("Code")) {
            const installExtensions = sourceExtensions.difference(vscodeExtensions)
            for (const ext of installExtensions) {
                try {
                    console.log(`code --install-extension ${ext}`)
                    await execAsync(`code --install-extension ${ext}`)
                } catch (error) {
                    console.error(`${ext} 安装失败`)
                }
            }
            const uninstallExtensions = vscodeExtensions.difference(sourceExtensions)
            for (const ext of uninstallExtensions) {
                try {
                    console.log(`code --uninstall-extension ${ext}`)
                    await execAsync(`code --uninstall-extension ${ext}`)
                } catch (error) {
                    console.error(`${ext} 卸载失败`)
                }
            }
        }

        if (targets.includes("Cursor")) {
            const installExtensions = sourceExtensions.difference(cursorExtensions)
            for (const ext of installExtensions) {
                try {
                    console.log(`cursor --install-extension ${ext}`)
                    await execAsync(`cursor --install-extension ${ext}`)
                } catch (error) {
                    console.error(`${ext} 安装失败`)
                }
            }
            const uninstallExtensions = cursorExtensions.difference(sourceExtensions)
            for (const ext of uninstallExtensions) {
                try {
                    console.log(`cursor --uninstall-extension ${ext}`)
                    await execAsync(`cursor --uninstall-extension ${ext}`)
                } catch (error) {
                    console.error(`${ext} 卸载失败`)
                }
            }
        }

        if (targets.includes("Online")) {
            await writeFile(join(onlinePath, "static", "extensions.json"), JSON.stringify(Array.from(sourceExtensions), null, 4))
        }
    }

    if (targets.includes("Online")) {
        if (await hasChangeNoCommit(onlinePath)) {
            await addGitCommit({
                message: getCommitMessage(CommitType.feature, "sync editor setting"),
                cwd: onlinePath,
            })
        }
    }

    await writeZixuluSetting(setting)
}
