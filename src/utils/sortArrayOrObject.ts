/**
 * 将数组或对象中的元素按字典序排序
 * @param data 要排序的数组或对象
 * @returns 排序后的数组或对象
 */
export function sortArrayOrObject(data: any) {
    if (typeof data !== "object" || data === null) return data
    if (Array.isArray(data)) {
        const _data = [...data]
        _data.sort()
        return _data
    }
    if (Object.getPrototypeOf(data) === Object.prototype) {
        const keys = Object.keys(data)
        keys.sort()
        const _data: Record<string, any> = {}
        for (const key of keys) {
            _data[key] = data[key]
        }
        return _data
    }
    return data
}
