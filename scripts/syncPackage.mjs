// @ts-check

/**
 * 同步包
 * @param {string} packageName 包名
 */
function syncPackage(packageName) {
    return fetch(
        `https://registry-direct.npmmirror.com/-/package/${packageName}/syncs`,
        {
            referrer: "https://npmmirror.com/",
            referrerPolicy: "strict-origin-when-cross-origin",
            method: "PUT",
            mode: "cors",
            credentials: "omit",
        },
    )
}

async function main() {
    const { readFile } = await import("fs/promises")
    const packageJson = JSON.parse(await readFile("package.json", "utf-8"))
    await syncPackage(packageJson.name)
}

main()
