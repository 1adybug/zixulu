import { capitalize } from "deepsea-tools"
import { existsSync } from "fs"
import { writeFile as _writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { isPathLike } from "soda-nodejs"

export interface AddApiParams {
    type: string
    api?: string
    hook?: string
}

async function writeFile(...args: Parameters<typeof _writeFile>) {
    const [path] = args
    if (isPathLike(path) && existsSync(path)) {
        const { default: inquirer } = await import("inquirer")

        interface Answer {
            override: boolean
        }

        const { override } = await inquirer.prompt<Answer>({
            type: "confirm",
            name: "override",
            message: `文件 ${path} 已存在，是否覆盖？`,
        })

        if (!override) return
    }
    return await _writeFile(...args)
}

export async function addApi({ type, api, hook }: AddApiParams) {
    type = capitalize(type)
    api ??= "apis"
    hook ??= "hooks"

    await mkdir(api, { recursive: true })
    await mkdir(hook, { recursive: true })

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

export const ${type}Name = "${type}"

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

    const useAdd = `import { useMutation } from "@tanstack/react-query"
import { nanoid } from "deepsea-tools"

import { add${type} } from "@/apis/add${type}"
import { ${type}Name } from "@/apis/query${type}"

export function useAdd${type}() {
    return useMutation({
        mutationFn: addPoliceIncident,
        onMutate() {
            const key = nanoid()
            message.open({
                key,
                type: "loading",
                content: \`新增\${PoliceIncidentName}中...\`,
            })
            return key
        },
        onSuccess(data, variables, key) {
            message.open({
                key,
                type: "success",
                content: \`新增\${PoliceIncidentName}成功\`,
            })
        },
        onError(error, variables, key) {
            message.open({
                key,
                type: "error",
                content: \`新增\${PoliceIncidentName}失败\`,
            })
        },
    })
}
`
    await writeFile(join(hook, `useAdd${type}.ts`), useAdd)

    const useUpdate = `import { useMutation } from "@tanstack/react-query"
import { nanoid } from "deepsea-tools"

import { ${type}Name } from "@/apis/query${type}"
import { update${type} } from "@/apis/update${type}"

export function useUpdate${type}() {
    return useMutation({
        mutationFn: update${type},
        onMutate() {
            const key = nanoid()
            message.open({
                key,
                type: "loading",
                content: \`更新\${${type}Name}中...\`,
            })
            return key
        },
        onSuccess(data, variables, key) {
            message.open({
                key,
                type: "success",
                content: \`更新\${${type}Name}成功\`,
            })
        },
        onError(error, variables, key) {
            message.open({
                key,
                type: "error",
                content: \`更新\${${type}Name}失败\`,
            })
        },
    })
}
`
    await writeFile(join(hook, `useUpdate${type}.ts`), useUpdate)

    const useDelete = `import { useMutation } from "@tanstack/react-query"
import { nanoid } from "deepsea-tools"

import { delete${type} } from "@/apis/delete${type}"
import { ${type}Name } from "@/apis/query${type}"

export function useDelete${type}() {
    return useMutation({
        mutationFn: delete${type},
        onMutate() {
            const key = nanoid()
            message.open({
                key,
                type: "loading",
                content: \`删除\${${type}Name}中...\`,
            })
            return key
        },
        onSuccess(data, variables, key) {
            message.open({
                key,
                type: "success",
                content: \`删除\${${type}Name}成功\`,
            })
        },
        onError(error, variables, key) {
            message.open({
                key,
                type: "error",
                content: \`删除\${${type}Name}失败\`,
            })
        },
    })
}
`
    await writeFile(join(hook, `useDelete${type}.ts`), useDelete)
}
