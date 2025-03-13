export function isStableVersion(version: string) {
    return /^\D*\d+(\.\d+)*$/.test(version)
}
