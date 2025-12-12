import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export type SetPackageJsonAction = PackageJsonData | ((prevState: PackageJson) => PackageJsonData)

export type PackageJson = Record<string, any>

export type PackageJsonData = PackageJson | Promise<PackageJson>

export interface SetPackageJsonParams {
    data: SetPackageJsonAction
    dir?: string
}

function isParmas(dataOrParams: PackageJsonData | SetPackageJsonParams): dataOrParams is SetPackageJsonParams {
    const keys = ["data", "dir"]

    return typeof dataOrParams === "object" && !(dataOrParams instanceof Promise) && Object.keys(dataOrParams).every(key => keys.includes(key))
}

export async function setPackageJson(dataOrParams: PackageJsonData | SetPackageJsonParams) {
    const { data, dir } = isParmas(dataOrParams) ? dataOrParams : { data: dataOrParams }

    if (typeof data === "function") {
        const current = await readPackageJson(dir)
        const next = await data(current)
        await writePackageJson({ data: next, dir })
        return next
    }

    const next = await data
    await writePackageJson({ data: next, dir })
    return next
}
