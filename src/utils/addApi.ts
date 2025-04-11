import { writeFile } from "fs/promises"
import { join } from "path"

export interface AddApiParams {
    type: string
    path?: string
}

export async function addApi({ type, path }: AddApiParams) {
    type = type.replace(/^\w/, c => c.toUpperCase())
    path ??= "apis"

    const type2 = type.replace(/^\w/, c => c.toLowerCase())

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

    await writeFile(join(path, `query${type}.ts`), query)

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

    await writeFile(join(path, `add${type}.ts`), add)

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

    await writeFile(join(path, `update${type}.ts`), update)

    const _delete = `import { request } from "@/utils/request"

import { ${type} } from "./query${type}"

export async function delete${type}(id: string) {
    const response = await request<${type}>(\`/${type2}/delete/\${id}\`, {
        method: "DELETE",
    })
    return response
}
`

    await writeFile(join(path, `delete${type}.ts`), _delete)

    const get = `import { request } from "@/utils/request"

import { ${type} } from "./query${type}"

export async function get${type}(id: string) {
    const response = await request<${type}>(\`/${type2}/get/\${id}\`, {
        method: "POST",
    })
    return response
}
`

    await writeFile(join(path, `get${type}.ts`), get)
}
