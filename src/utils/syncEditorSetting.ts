import { existsSync } from "fs"
import { mkdir, readFile, rename, writeFile } from "fs/promises"
import { homedir } from "os"
import { join, parse } from "path"

import consola from "consola"
import inquirer from "inquirer"
import { execAsync } from "soda-nodejs"

import { CommitType } from "@/constant"

import { addGitCommit } from "./addGitCommit"
import { getCommitMessage } from "./getCommitMessage"
import { getEditorExtensions } from "./getEditorExtensions"
import { hasAntiGravity } from "./hasAntiGravity"
import { hasChangeNoCommit } from "./hasChangeNoCommit"
import { hasCode } from "./hasCode"
import { hasCursor } from "./hasCursor"
import { readZixuluSetting } from "./readZixuluSetting"
import { writeZixuluSetting } from "./writeZixuluSetting"

export type Editor = "Code" | "Cursor" | "Antigravity"

export type SyncEditorSettingSource = Editor | "Online"

export type EditorFileType = "settings" | "snippets"

export type EditorConfigType = EditorFileType | "extensions"

export type EditorFileSourceMap = Record<EditorFileType, Record<SyncEditorSettingSource, string>>

const userDir = homedir()

const fileSourceMap: EditorFileSourceMap = {
    settings: {
        Code: join(userDir, "AppData/Roaming/Code/User/settings.json"),
        Cursor: join(userDir, "AppData/Roaming/Cursor/User/settings.json"),
        Antigravity: join(userDir, "AppData/Roaming/Antigravity/User/settings.json"),
        Online: "https://luzixu.geskj.com/settings.json",
    },
    snippets: {
        Code: join(userDir, "AppData/Roaming/Code/User/snippets/global.code-snippets"),
        Cursor: join(userDir, "AppData/Roaming/Cursor/User/snippets/global.code-snippets"),
        Antigravity: join(userDir, "AppData/Roaming/Antigravity/User/snippets/global.code-snippets"),
        Online: "https://luzixu.geskj.com/global.code-snippets",
    },
}

export interface SyncEditorSettingParams {
    source: SyncEditorSettingSource
    target: Editor
}

export interface SyncEditorFileItem {
    type: SyncEditorSettingSource
    value: string
}

export interface SyncEditorFileParams {
    source: SyncEditorFileItem
    target: SyncEditorFileItem
}

async function getFile(source: string) {
    if (source.startsWith("http")) {
        const response = await fetch(source)
        return await response.text()
    }

    return await readFile(source, "utf-8")
}

export async function syncEditorFile({
    source: { type: sourceType, value: sourceValue },
    target: { type: targetType, value: targetValue },
}: SyncEditorFileParams) {
    const { dir, base } = parse(targetValue)
    await mkdir(dir, { recursive: true })
    const setting = await readZixuluSetting()
    let code = await getFile(sourceValue)

    if (targetType === "Code") code = code.replace(/\n^ *"extensions\.gallery\.serviceUrl":.+,?$/m, "")

    if (targetType === "Antigravity") {
        code = code.replace(/\n^ *"extensions\.gallery\.serviceUrl":.+,?$/m, "").replace(
            /}[ \n]*$/,
            `    "antigravity.marketplaceExtensionGalleryServiceURL": "https://marketplace.visualstudio.com/_apis/public/gallery",
    "antigravity.marketplaceGalleryItemURL": "https://marketplace.visualstudio.com/items",
    "json.schemaDownload.enable": true,
}
`,
        )
    }

    if (existsSync(targetValue)) {
        const text = await readFile(targetValue, "utf-8")

        if (text === code) {
            consola.success(`${targetValue} 已是最新`)
            return
        } else {
            type Answer = { backup: boolean }

            let backup = false

            if (targetType !== "Online") {
                const answer = await inquirer.prompt<Answer>({
                    type: "confirm",
                    name: "backup",
                    message: `是否备份原文件（${targetValue}）`,
                    default: setting.syncEditor?.fileConfigs?.[targetValue]?.backup ?? true,
                })

                backup = answer.backup
            }

            setting.syncEditor ??= {}
            setting.syncEditor.fileConfigs ??= {}
            setting.syncEditor.fileConfigs[targetValue] ??= {}
            setting.syncEditor.fileConfigs[targetValue].backup = backup

            await writeZixuluSetting(setting)
            if (backup) await rename(targetValue, join(dir, `${base}.${Date.now()}.bak`))
        }
    }

    await writeFile(targetValue, code, "utf-8")
    consola.success(`${targetValue} 同步完成`)
}

export async function syncEditorSetting() {
    const setting = await readZixuluSetting()

    interface Answer {
        source: SyncEditorSettingSource
        types: EditorConfigType[]
        targets: SyncEditorSettingSource[]
    }

    const sourceChoices = ["Online"]

    if (hasCode()) sourceChoices.unshift("Code")
    if (hasCursor()) sourceChoices.unshift("Cursor")
    if (hasAntiGravity()) sourceChoices.unshift("Antigravity")

    const { source } = await inquirer.prompt<Answer>([
        {
            type: "list",
            name: "source",
            message: "选择同步来源",
            choices: sourceChoices,
            default: setting.syncEditor?.source ?? "Cursor",
        },
    ])

    setting.syncEditor ??= {}
    setting.syncEditor.source = source

    const targetChoices = sourceChoices.filter(v => v !== source)

    if (targetChoices.length === 0) return consola.info("没有可同步的目标")

    const { targets, types } = await inquirer.prompt<Answer>([
        {
            type: "checkbox",
            name: "targets",
            message: "选择同步目标",
            choices: targetChoices,
            default: setting.syncEditor?.targets?.filter(item => targetChoices.includes(item)) ?? targetChoices,
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
            message: "请输入 blog 文件夹的路径（留空则跳过）",
            default: setting.syncEditor?.onlinePath,
        })

        setting.syncEditor.onlinePath = onlinePath.trim() ?? undefined
    }

    if (!setting.syncEditor.onlinePath) setting.syncEditor.targets = targets.filter(v => v !== "Online")

    const onlinePath = setting.syncEditor.onlinePath!

    const configs: SyncEditorFileParams[] = types
        .filter(item => item !== "extensions")
        .map(fileType =>
            targets.map(target => ({
                source: { type: source, value: fileSourceMap[fileType][source] },
                target: {
                    type: target,
                    value:
                        target === "Online"
                            ? join(onlinePath, "static", fileType === "settings" ? "settings.json" : "global.code-snippets")
                            : fileSourceMap[fileType][target],
                },
            })))
        .flat()

    for (const config of configs) await syncEditorFile(config)

    if (types.includes("extensions")) {
        const vscodeExtensions = await getEditorExtensions({ source: "Code" })
        const cursorExtensions = await getEditorExtensions({ source: "Cursor" })
        const antigravityExtensions = await getEditorExtensions({ source: "Antigravity" })
        const onlineExtensions = await getEditorExtensions({ source: "Online" })

        const sourceExtensions =
            source === "Code" ? vscodeExtensions : source === "Cursor" ? cursorExtensions : source === "Antigravity" ? antigravityExtensions : onlineExtensions

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

        if (targets.includes("Antigravity")) {
            const installExtensions = sourceExtensions.difference(antigravityExtensions)

            for (const ext of installExtensions) {
                try {
                    console.log(`antigravity --install-extension ${ext}`)
                    await execAsync(`antigravity --install-extension ${ext}`)
                } catch (error) {
                    console.error(`${ext} 安装失败`)
                }
            }

            const uninstallExtensions = antigravityExtensions.difference(sourceExtensions)

            for (const ext of uninstallExtensions) {
                try {
                    console.log(`antigravity --uninstall-extension ${ext}`)
                    await execAsync(`antigravity --uninstall-extension ${ext}`)
                } catch (error) {
                    console.error(`${ext} 卸载失败`)
                }
            }
        }

        if (targets.includes("Online")) await writeFile(join(onlinePath, "static", "extensions.json"), JSON.stringify(Array.from(sourceExtensions), null, 4))
    }

    if (targets.includes("Online")) {
        await execAsync("npm run format", { cwd: onlinePath })

        if (await hasChangeNoCommit(onlinePath)) {
            await addGitCommit({
                message: getCommitMessage(CommitType.feature, "sync editor setting"),
                cwd: onlinePath,
            })
            await execAsync(`git push`, {
                cwd: onlinePath,
            })
        }
    }

    await writeZixuluSetting(setting)
}
