import { applyEdits, JSONPath, ModificationOptions, modify } from "jsonc-parser"

export function modifyJsonc(text: string, path: JSONPath, value: any, options?: ModificationOptions) {
    options = { ...options }
    options.formattingOptions = { ...options.formattingOptions }
    options.formattingOptions.tabSize ??= 4
    options.formattingOptions.insertSpaces ??= true
    options.formattingOptions.insertFinalNewline ??= true
    options.formattingOptions.keepLines ??= true
    options.formattingOptions.eol ??= "\n"

    const edits = modify(text, path, value, options)

    return applyEdits(text, edits)
}
