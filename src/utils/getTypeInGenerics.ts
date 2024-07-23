export function getTypeInGenerics(str: string, start = 0) {
    if (str[start] !== "<") throw new Error("无效的泛型")
    let count = 1
    let index: number | undefined = undefined
    for (let i = start + 1; i < str.length; i++) {
        const w = str[i]
        if (w === "<") {
            count++
            continue
        }
        if (w === ">") {
            count--
            if (count === 0) {
                index = i
                break
            }
        }
    }
    if (index === undefined) throw new Error("无效的泛型")
    return str.slice(start + 1, index)
}
