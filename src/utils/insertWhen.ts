export interface InsertWhenParams {
    breakBefore?: boolean
    breakAfter?: boolean
}

export function insertWhen(
    condition: unknown,
    str: string | string[],
    params: InsertWhenParams = {},
) {
    const { breakBefore, breakAfter } = params
    const strs = Array.isArray(str) ? str : [str]
    if (breakBefore) strs.unshift("")
    if (breakAfter) strs.push("")
    return condition ? strs.join("\n") : ""
}
