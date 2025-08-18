export function logArgs(...rest: unknown[]) {
    rest.slice(0, -1).forEach(arg => console.log(arg))
}
