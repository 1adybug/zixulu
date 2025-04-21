import { writeFile } from "fs/promises"
import { join } from "path"

export interface AddApiParams {
    type: string
    api?: string
    hook?: string
}

export async function addApi({ type, api, hook }: AddApiParams) {
    type = type.replace(/^\w/, c => c.toUpperCase())
    api ??= "apis"
    hook ??= "hooks"

    const type2 = type.replace(/([A-Z])/g, (_, c) => `-${c.toLowerCase()}`).replace(/^-/, "")

    const query = `import { Page } from "deepsea-tools"

import { request } from "@/utils/request"

export interface Query${type}Params {
    pageSize?: number
    pageNum?: number
}

export interface ${type} {
    id: string
    name: string
}

export async function query${type}(params: Query${type}Params) {
    const response = await request<Page<${type}>>("/${type2}/query", {
        method: "POST",
        body: params,
    })
    return response
}
`

    await writeFile(join(api, `query${type}.ts`), query)

    const add = `import { request } from "@/utils/request"

import { ${type} } from "./query${type}"

export interface Add${type}Params extends Pick<${type}, "name"> {}

export async function add${type}(params: Add${type}Params) {
    const response = await request<${type}>("/${type2}/add", {
        method: "POST",
        body: params,
    })
    return response
}
`

    await writeFile(join(api, `add${type}.ts`), add)

    const update = `import { request } from "@/utils/request"

import { ${type} } from "./query${type}"

export interface Update${type}Params extends Pick<${type}, "id" | "name"> {}

export async function update${type}(params: Update${type}Params) {
    const response = await request<${type}>("/${type2}/update", {
        method: "POST",
        body: params,
    })
    return response
}
`

    await writeFile(join(api, `update${type}.ts`), update)

    const _delete = `import { request } from "@/utils/request"

import { ${type} } from "./query${type}"

export async function delete${type}(id: string) {
    const response = await request<${type}>(\`/${type2}/delete/\${id}\`, {
        method: "DELETE",
    })
    return response
}
`

    await writeFile(join(api, `delete${type}.ts`), _delete)

    const get = `import { request } from "@/utils/request"

import { ${type} } from "./query${type}"

export async function get${type}(id: string) {
    const response = await request<${type}>(\`/${type2}/get/\${id}\`, {
        method: "POST",
    })
    return response
}
`

    await writeFile(join(api, `get${type}.ts`), get)

    const useQuery = `import { useQuery } from "@tanstack/react-query"

import { Query${type}Params, query${type} } from "@/apis/query${type}"

export function use${type}(params: Query${type}Params) {
    return useQuery({
        queryKey: ["query-${type2}", params],
        queryFn: () => query${type}(params),
    })
}
`

    await writeFile(join(hook, `useQuery${type}.ts`), useQuery)

    const useGet = `import { useQuery } from "@tanstack/react-query"
import { isNonNullable } from "deepsea-tools"

import { get${type} } from "@/apis/get${type}"

export interface UseGet${type}Params {
    id?: string | undefined
    enabled?: boolean
}

export function useGet${type}(idOrParams?: UseGet${type}Params | string | undefined) {
    const { id, enabled = true } = typeof idOrParams === "object" ? idOrParams : { id: idOrParams, enabled: true }

    return useQuery({
        queryKey: ["get-${type2}", id],
        queryFn: () => (isNonNullable(id) ? get${type}(id) : Promise.resolve(null)),
        enabled,
    })
}
`
    await writeFile(join(hook, `useGet${type}.ts`), useGet)
}
