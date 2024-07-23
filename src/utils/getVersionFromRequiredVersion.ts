/**
 * 获取版本号
 * @param requiredVersion - 版本号
 * @returns 版本号
 */
export function getVersionFromRequiredVersion(requiredVersion: string) {
    return requiredVersion.replace(/^\D*/, "")
}
