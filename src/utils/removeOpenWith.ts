import { writeFile } from "node:fs/promises"

import {
    buildOpenWithCommand,
    getOpenWithName,
    getOpenWithRegistryTargets,
    listOpenWithRegistryItems,
    normalizeOpenWithCommand,
    normalizeOpenWithName,
    OpenWithOptions,
} from "./addOpenWith"

export async function removeOpenWith(name: string, { file, folder, background }: OpenWithOptions) {
    if (!file && !folder && !background) throw new Error("至少选择一个")

    const openWithName = getOpenWithName(name)
    const normalizedName = normalizeOpenWithName(openWithName)
    const targets = getOpenWithRegistryTargets({ file, folder, background })
    const removedKeyPaths = new Set<string>()

    let reg = `\ufeffWindows Registry Editor Version 5.00
`

    for (const target of targets) {
        const targetItems = await listOpenWithRegistryItems(target.registryPath)
        const exactMatchItems = targetItems.filter(item => item.keyName.toLowerCase() === normalizedName)
        const referenceCommands = new Set<string>()

        for (const item of exactMatchItems) {
            if (item.normalizedCommand) referenceCommands.add(item.normalizedCommand)
        }

        if (referenceCommands.size === 0) {
            for (const item of targetItems) {
                if (item.commandInfo?.executableName !== normalizedName) continue
                if (!item.command) continue

                referenceCommands.add(normalizeOpenWithCommand(buildOpenWithCommand(item.commandInfo.executablePath, target.commandArg)))
                if (item.normalizedCommand) referenceCommands.add(item.normalizedCommand)
            }
        }

        removedKeyPaths.add(`${target.registryPath}\\${openWithName}`)

        for (const item of targetItems) {
            if (!item.normalizedCommand) continue
            if (!referenceCommands.has(item.normalizedCommand)) continue

            removedKeyPaths.add(item.keyPath)
        }
    }

    for (const keyPath of removedKeyPaths) {
        reg += `
[-${keyPath}]`
    }

    // 生成一个以 remove_ 开头的文件，防止覆盖原有的生成文件
    await writeFile(`remove_open_with_${openWithName}.reg`, reg, "utf-16le")
}
