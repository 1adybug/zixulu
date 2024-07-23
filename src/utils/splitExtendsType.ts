import { getTypeInGenerics } from "./getTypeInGenerics"

export function splitExtendsType(str: string) {
    const types: string[] = []
    let index = 0
    for (let i = 0; i < str.length; i++) {
        const w = str[i]
        if (w === "<") {
            const type = getTypeInGenerics(str, i)
            i += type.length + 1
            continue
        }
        if (w === ",") {
            types.push(str.slice(index, i))
            index = i + 1
        }
    }
    types.push(str.slice(index))
    return types.map(v => v.trim()).filter(v => v)
}