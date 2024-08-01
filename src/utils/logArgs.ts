export function logArgs(...rest: any[]) {
    rest.slice(0, -1).forEach(arg => console.log(arg))
}
