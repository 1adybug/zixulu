export function unique<T>(data: T[]): T[] {
    return Array.from(new Set(data))
}
