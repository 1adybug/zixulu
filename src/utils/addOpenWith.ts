import { stat, writeFile } from "node:fs/promises"
import { parse, resolve } from "node:path"

import { execAsync } from "soda-nodejs"

export interface OpenWithOptions {
    file: boolean
    folder: boolean
    background: boolean
}

export interface OpenWithRegistryTarget {
    registryPath: string
    commandArg: string
}

export interface OpenWithCommandInfo {
    executablePath: string
    executableName: string
    args: string
}

export interface OpenWithRegistryItem {
    keyName: string
    keyPath: string
    command?: string
    normalizedCommand?: string
    commandInfo?: OpenWithCommandInfo
}

export function getOpenWithRegistryTargets({ file, folder, background }: OpenWithOptions) {
    const targets: OpenWithRegistryTarget[] = []

    if (file) {
        targets.push({
            registryPath: "HKEY_CLASSES_ROOT\\*\\shell",
            commandArg: "%1",
        })
    }

    if (folder) {
        targets.push({
            registryPath: "HKEY_CLASSES_ROOT\\Directory\\shell",
            commandArg: "%V",
        })
    }

    if (background) {
        targets.push({
            registryPath: "HKEY_CLASSES_ROOT\\Directory\\Background\\shell",
            commandArg: "%V",
        })
    }

    return targets
}

export function normalizeOpenWithText(value: string) {
    return value
        .trim()
        .replace(/[\\/]+/g, "\\")
        .replace(/\s+/g, " ")
        .toLowerCase()
}

export function parseOpenWithCommand(command: string) {
    const trimmedCommand = command.trim()

    if (!trimmedCommand) return

    const quotedMatch = trimmedCommand.match(/^"([^"]+)"(?:\s+(.*))?$/)
    const unquotedMatch = quotedMatch ? undefined : trimmedCommand.match(/^(\S+)(?:\s+(.*))?$/)
    const executablePath = quotedMatch?.[1] ?? unquotedMatch?.[1]

    if (!executablePath) return

    const args = quotedMatch?.[2] ?? unquotedMatch?.[2] ?? ""
    const normalizedPath = normalizeOpenWithText(executablePath)

    return {
        executablePath: normalizedPath,
        executableName: parse(normalizedPath).name.toLowerCase(),
        args: normalizeOpenWithText(args),
    }
}

export function normalizeOpenWithCommand(command: string) {
    const commandInfo = parseOpenWithCommand(command)

    if (!commandInfo) return normalizeOpenWithText(command)

    return `${commandInfo.executablePath} ${commandInfo.args}`.trim()
}

export function getOpenWithName(name: string) {
    const normalizedName = name.trim().replace(/^"(.*)"$/, "$1")
    const parsedName = parse(normalizedName)

    return parsedName.name || normalizedName
}

export function normalizeOpenWithName(name: string) {
    return getOpenWithName(name).toLowerCase()
}

export function buildOpenWithCommand(path: string, commandArg: string) {
    return `"${path}" "${commandArg}"`
}

export function getOpenWithRegSection(name: string, path: string, registryPath: string, commandArg: string) {
    const escapedPath = path.replace(/[\\/]/g, "\\\\")

    return `
[${registryPath}\\${name}]
@="通过 ${name} 打开"
"Icon"="\\"${escapedPath}\\""

[${registryPath}\\${name}\\command]
@="\\"${escapedPath}\\" \\"${commandArg}\\""`
}

export async function listOpenWithRegistryItems(registryPath: string) {
    try {
        const output = await execAsync(`reg query "${registryPath}" /s /ve`)
        const lines = output.split(/\r?\n/)
        const items = new Map<string, OpenWithRegistryItem>()
        let currentSection = ""

        for (const line of lines) {
            const trimmedLine = line.trim()

            if (!trimmedLine) continue

            if (/^HKEY_/i.test(trimmedLine)) {
                currentSection = trimmedLine
                continue
            }

            const valueMatch = line.match(/^\s+\(Default\)\s+REG_\w+\s*(.*)$/)

            if (!valueMatch || !currentSection.startsWith(`${registryPath}\\`)) continue

            const relativePath = currentSection.slice(registryPath.length + 1)
            const pathParts = relativePath.split("\\")
            const keyName = pathParts[0]

            if (!keyName) continue

            const item = items.get(keyName) ?? {
                keyName,
                keyPath: `${registryPath}\\${keyName}`,
            }

            if (pathParts.length === 2 && pathParts[1].toLowerCase() === "command") {
                const command = valueMatch[1].trim()

                item.command = command
                item.normalizedCommand = normalizeOpenWithCommand(command)
                item.commandInfo = parseOpenWithCommand(command)
            }

            items.set(keyName, item)
        }

        return Array.from(items.values())
    } catch (error) {
        return []
    }
}

export async function addOpenWith(path: string, { file, folder, background }: OpenWithOptions) {
    if (!file && !folder && !background) throw new Error("至少选择一个")

    path = resolve(path)

    try {
        const status = await stat(path)
        if (!status.isFile()) throw new Error("路径不是文件")
    } catch (error) {}

    const { name } = parse(path)
    const targets = getOpenWithRegistryTargets({ file, folder, background })

    let reg = `\ufeffWindows Registry Editor Version 5.00
`

    for (const target of targets) {
        const targetItems = await listOpenWithRegistryItems(target.registryPath)
        const normalizedCommand = normalizeOpenWithCommand(buildOpenWithCommand(path, target.commandArg))
        const hasSameCommand = targetItems.some(item => item.normalizedCommand === normalizedCommand)

        if (hasSameCommand) continue

        reg += getOpenWithRegSection(name, path, target.registryPath, target.commandArg)
    }

    await writeFile(`add_open_with_${name}.reg`, reg, "utf-16le")
}
