import { access } from "node:fs/promises"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"

import { execAsync } from "soda-nodejs"

import type { Editor, SyncEditorSettingSource } from "./syncEditorSetting"

export const EditorExtensionCommandMap = {
    Code: "code",
    Cursor: "cursor",
    Antigravity: "antigravity",
} as const

export interface GetEditorExtensionsParams {
    source: SyncEditorSettingSource
}

export interface GetEditorExtensionCommandParams {
    editor: Editor
}

export interface GetEditorWindowsCliCandidatesParams {
    editor: Editor
}

export interface PathExistsParams {
    path: string
}

export interface QuoteShellCommandParams {
    command: string
}

const editorExtensionCommandCache = new Map<Editor, string>()

async function pathExists({ path }: PathExistsParams) {
    try {
        await access(path)
        return true
    } catch {
        return false
    }
}

function quoteShellCommand({ command }: QuoteShellCommandParams) {
    if (!/[\s()]/.test(command)) return command
    return `"${command.replace(/"/g, `\\"`)}"`
}

function getEditorWindowsCliCandidates({ editor }: GetEditorWindowsCliCandidatesParams) {
    const command = EditorExtensionCommandMap[editor]
    const candidates = new Set<string>()
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local")
    const programFiles = process.env.ProgramFiles ?? "C:/Program Files"
    const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:/Program Files (x86)"

    if (editor === "Code") {
        candidates.add(join(localAppData, "Programs", "Microsoft VS Code", "bin", "code.cmd"))
        candidates.add(join(programFiles, "Microsoft VS Code", "bin", "code.cmd"))
        candidates.add(join(programFilesX86, "Microsoft VS Code", "bin", "code.cmd"))
    }

    if (editor === "Cursor") {
        candidates.add(join(localAppData, "Programs", "Cursor", "resources", "app", "bin", "cursor.cmd"))
        candidates.add(join(localAppData, "Programs", "cursor", "resources", "app", "bin", "cursor.cmd"))
        candidates.add(join(programFiles, "Cursor", "resources", "app", "bin", "cursor.cmd"))
        candidates.add(join(programFilesX86, "Cursor", "resources", "app", "bin", "cursor.cmd"))
    }

    if (editor === "Antigravity") {
        candidates.add(join(localAppData, "Programs", "Antigravity", "bin", "antigravity.cmd"))
        candidates.add(join(localAppData, "Programs", "Antigravity", "resources", "app", "bin", "antigravity.cmd"))
        candidates.add(join(programFiles, "Antigravity", "bin", "antigravity.cmd"))
        candidates.add(join(programFiles, "Antigravity", "resources", "app", "bin", "antigravity.cmd"))
        candidates.add(join(programFilesX86, "Antigravity", "bin", "antigravity.cmd"))
        candidates.add(join(programFilesX86, "Antigravity", "resources", "app", "bin", "antigravity.cmd"))
    }

    const pathDirs = process.env.PATH?.split(delimiter).filter(Boolean) ?? []

    for (const dir of pathDirs) {
        candidates.add(join(dir, `${command}.cmd`))
        candidates.add(join(dir, command))
    }

    return Array.from(candidates)
}

export async function canGetEditorExtensions({ editor }: GetEditorExtensionCommandParams) {
    const command = await getEditorExtensionCommand({ editor })

    try {
        await execAsync(`${command} --version`)
        return true
    } catch {
        return false
    }
}

export async function getEditorExtensionCommand({ editor }: GetEditorExtensionCommandParams) {
    const cachedCommand = editorExtensionCommandCache.get(editor)
    if (cachedCommand) return cachedCommand

    const fallbackCommand = EditorExtensionCommandMap[editor]

    if (process.platform !== "win32") {
        editorExtensionCommandCache.set(editor, fallbackCommand)
        return fallbackCommand
    }

    // Windows 上优先查找真正的 CLI 脚本，避免直接调用编辑器 exe 打开窗口
    for (const candidate of getEditorWindowsCliCandidates({ editor })) {
        if (!(await pathExists({ path: candidate }))) continue

        const command = quoteShellCommand({ command: candidate })
        editorExtensionCommandCache.set(editor, command)
        return command
    }

    throw new Error(`${editor} 命令行工具不可用，请确认已安装并加入 PATH`)
}

export async function getEditorExtensions({ source }: GetEditorExtensionsParams) {
    let data: string[] = []

    if (source !== "Online") {
        const command = await getEditorExtensionCommand({ editor: source })
        const output = await execAsync(`${command} --list-extensions`)
        data = output
            .split("\n")
            .map(item => item.trim())
            .filter(Boolean)
    } else {
        const response = await fetch("https://luzixu.geskj.com/extensions.json")
        data = await response.json()
    }

    data = data.filter(item => !item.startsWith("anysphere.") && item !== "github.copilot" && item !== "github.copilot-chat")

    return new Set(data)
}
