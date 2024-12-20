export function isPositiveInteger(value: any, allowZero = false): value is number {
    return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0)
}
