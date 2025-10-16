export function isPositiveInteger(
    value: unknown,
    allowZero = false,
): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        (allowZero ? value >= 0 : value > 0)
    )
}
