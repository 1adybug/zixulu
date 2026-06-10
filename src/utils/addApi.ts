import { existsSync } from "node:fs"
import { writeFile as _writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

import { capitalize } from "deepsea-tools"
import inquirer from "inquirer"
import { isPathLike } from "soda-nodejs"

export const AddApiIdType = {
    字符串: "string",
    数字: "number",
} as const

export type AddApiIdType = (typeof AddApiIdType)[keyof typeof AddApiIdType]

export interface AddApiParams {
    type: string
    api?: string
    hook?: string
    idType?: AddApiIdType
    name?: string
    prefix?: string
    suffix?: string
}

async function writeFile(...args: Parameters<typeof _writeFile>) {
    const [path] = args

    if (isPathLike(path) && existsSync(path)) {
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

export async function addApi({ type, api, hook, idType = AddApiIdType.字符串, name, prefix = "", suffix = "" }: AddApiParams) {
    type = capitalize(type)
    const itemType = `${prefix ? capitalize(prefix) : ""}${type}${suffix ? capitalize(suffix) : ""}`
    name ??= type
    api ??= "apis"
    hook ??= "hooks"

    await mkdir(api, { recursive: true })
    await mkdir(hook, { recursive: true })

    const type2 = type.replace(/([A-Z])/g, (_, c) => `-${c.toLowerCase()}`).replace(/^-/, "")

    interface Answer {
        items: string[]
    }

    const { items } = await inquirer.prompt<Answer>({
        type: "checkbox",
        name: "items",
        message: `请选择需要添加的${type}字段`,
        choices: ["query", "get", "add", "update", "delete"],
    })

    const query = `import type { Page } from "deepsea-tools"

import { request } from "@/utils/request"

export interface Query${type}Params {
    pageSize?: number
    pageNum?: number
}

export interface ${itemType} {
    id: ${idType}
    name: string
}

export async function query${type}(params: Query${type}Params) {
    const response = await request<Page<${itemType}>>("/${type2}/query", {
        method: "POST",
        body: params,
    })
    return response
}

export async function getAll${type}() {
    const response = await request<${itemType}[]>("/${type2}/getAll", {
        method: "POST",
    })
    return response
}
`

    if (items.includes("query")) await writeFile(join(api, `query${type}.ts`), query)

    const add = `import { request } from "@/utils/request"

import type { ${itemType} } from "./query${type}"

export interface Add${type}Params extends Pick<${itemType}, "name"> {}

export async function add${type}(params: Add${type}Params) {
    const response = await request<${itemType}>("/${type2}/add", {
        method: "POST",
        body: params,
    })
    return response
}
`

    if (items.includes("add")) await writeFile(join(api, `add${type}.ts`), add)

    const update = `import { request } from "@/utils/request"

import type { ${itemType} } from "./query${type}"

export interface Update${type}Params extends Pick<${itemType}, "id" | "name"> {}

export async function update${type}(params: Update${type}Params) {
    const response = await request<${itemType}>("/${type2}/update", {
        method: "POST",
        body: params,
    })
    return response
}
`

    if (items.includes("update")) await writeFile(join(api, `update${type}.ts`), update)

    const _delete = `import { request } from "@/utils/request"

import type { ${itemType} } from "./query${type}"

export async function delete${type}(id: ${idType}) {
    const response = await request<${itemType}>(\`/${type2}/delete/\${id}\`, {
        method: "DELETE",
    })
    return response
}
`

    if (items.includes("delete")) await writeFile(join(api, `delete${type}.ts`), _delete)

    const get = `import { request } from "@/utils/request"

import type { ${itemType} } from "./query${type}"

export async function get${type}(id: ${idType}) {
    const response = await request<${itemType}>(\`/${type2}/get/\${id}\`, {
        method: "POST",
    })
    return response
}
`

    if (items.includes("get")) await writeFile(join(api, `get${type}.ts`), get)

    const useQuery = `import { createUseQuery } from "soda-tanstack-query"

import { getAll${type}, query${type} } from "@/apis/query${type}"

export const useQuery${type} = createUseQuery({
    queryFn: query${type},
    queryKey: "query-${type2}",
})

export const useGetAll${type} = createUseQuery({
    queryFn: getAll${type},
    queryKey: "get-all-${type2}",
    staleTime: Infinity,
    gcTime: Infinity,
})
`

    if (items.includes("query")) await writeFile(join(hook, `useQuery${type}.ts`), useQuery)

    const useGet = `import { isNonNullable } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { get${type} } from "@/apis/get${type}"

export function get${type}Optional(params?: Parameters<typeof get${type}>[0] | undefined) {
    return isNonNullable(params) ? get${type}(params) : null
}

export const useGet${type} = createUseQuery({
    queryFn: get${type}Optional,
    queryKey: "get-${type2}",
})
`

    if (items.includes("get")) await writeFile(join(hook, `useGet${type}.ts`), useGet)

    const useAdd = `import { useId } from "react"

import { createUseMutation } from "soda-tanstack-query"

import { add${type} } from "@/apis/add${type}"

export const useAdd${type} = createUseMutation(() => {
    const key = useId()

    return {
        mutationFn: add${type},
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: ${JSON.stringify(`新增${name}中...`)},
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-${type2}"] })
            context.client.invalidateQueries({ queryKey: ["get-${type2}"] })

            message.open({
                key,
                type: "success",
                content: ${JSON.stringify(`新增${name}成功`)},
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
`

    if (items.includes("add")) await writeFile(join(hook, `useAdd${type}.ts`), useAdd)

    const useUpdate = `import { useId } from "react"

import { createUseMutation } from "soda-tanstack-query"

import { update${type} } from "@/apis/update${type}"

export const useUpdate${type} = createUseMutation(() => {
    const key = useId()

    return {
        mutationFn: update${type},
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: ${JSON.stringify(`修改${name}中...`)},
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-${type2}"] })
            context.client.invalidateQueries({ queryKey: ["get-${type2}"] })

            message.open({
                key,
                type: "success",
                content: ${JSON.stringify(`修改${name}成功`)},
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
`

    if (items.includes("update")) await writeFile(join(hook, `useUpdate${type}.ts`), useUpdate)

    const useDelete = `import { useId } from "react"

import { createUseMutation } from "soda-tanstack-query"

import { delete${type} } from "@/apis/delete${type}"

export const useDelete${type} = createUseMutation(() => {
    const key = useId()

    return {
        mutationFn: delete${type},
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: ${JSON.stringify(`删除${name}中...`)},
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-${type2}"] })
            context.client.invalidateQueries({ queryKey: ["get-${type2}"] })

            message.open({
                key,
                type: "success",
                content: ${JSON.stringify(`删除${name}成功`)},
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
`

    if (items.includes("delete")) await writeFile(join(hook, `useDelete${type}.ts`), useDelete)
}
