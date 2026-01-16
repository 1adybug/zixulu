import { existsSync } from "node:fs"
import { writeFile as _writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

import { capitalize } from "deepsea-tools"
import inquirer from "inquirer"
import { isPathLike } from "soda-nodejs"

export interface AddApiParams {
    type: string
    api?: string
    hook?: string
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

export async function addApi({ type, api, hook }: AddApiParams) {
    type = capitalize(type)
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

export type ${type}Id = ${type}["id"]

export const ${type}Name = "${type}"

export async function query${type}(params: Query${type}Params) {
    const response = await request<Page<${type}>>("/${type2}/query", {
        method: "POST",
        body: params,
    })
    return response
}
`

    if (items.includes("query")) await writeFile(join(api, `query${type}.ts`), query)

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

    if (items.includes("add")) await writeFile(join(api, `add${type}.ts`), add)

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

    if (items.includes("update")) await writeFile(join(api, `update${type}.ts`), update)

    const _delete = `import { request } from "@/utils/request"

import { ${type}, ${type}Id } from "./query${type}"

export type Delete${type}Params = ${type}Id

export async function delete${type}(id: Delete${type}Params) {
    const response = await request<${type}>(\`/${type2}/delete/\${id}\`, {
        method: "DELETE",
    })
    return response
}
`

    if (items.includes("delete")) await writeFile(join(api, `delete${type}.ts`), _delete)

    const get = `import { request } from "@/utils/request"

import { ${type}, ${type}Id } from "./query${type}"

export type Get${type}Params = ${type}Id

export async function get${type}(id: Get${type}Params) {
    const response = await request<${type}>(\`/${type2}/get/\${id}\`, {
        method: "POST",
    })
    return response
}
`

    if (items.includes("get")) await writeFile(join(api, `get${type}.ts`), get)

    const useQuery = `import { useQuery } from "@tanstack/react-query"

import { Query${type}Params, query${type} } from "@/apis/query${type}"

export function useQuery${type}(params: Query${type}Params) {
    return useQuery({
        queryKey: ["query-${type2}", params],
        queryFn: () => query${type}(params),
    })
}
`

    if (items.includes("query")) await writeFile(join(hook, `useQuery${type}.ts`), useQuery)

    const useGet = `import { useQuery } from "@tanstack/react-query"
import { isNonNullable, resolveNull } from "deepsea-tools"

import { Get${type}Params, get${type} } from "@/apis/get${type}"

export interface UseGet${type}Params {
    id?: Get${type}Params | undefined
    enabled?: boolean
}

export function useGet${type}(idOrParams?: UseGet${type}Params | Get${type}Params | undefined) {
    const { id, enabled = true } = typeof idOrParams === "object" ? idOrParams : { id: idOrParams, enabled: true }

    return useQuery({
        queryKey: ["get-${type2}", id],
        queryFn: isNonNullable(id) ? () => get${type}(id) : resolveNull,
        enabled,
    })
}
`

    if (items.includes("get")) await writeFile(join(hook, `useGet${type}.ts`), useGet)

    const useAdd = `import { useId } from "react"
import { UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query"

import { Add${type}Params, add${type} } from "@/apis/add${type}"
import { ${type}, ${type}Name } from "@/apis/query${type}"

export interface UseAdd${type}Params<TContext = never>
    extends Omit<UseMutationOptions<${type}, Error, Add${type}Params, TContext>, "mutationFn"> {}

export function useAdd${type}<TContext = never>({ onMutate, onSuccess, onError, onSettled, ...rest }: UseAdd${type}Params<TContext> = {}) {
    const key = useId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: add${type},
        onMutate(variables) {
            message.open({
                key,
                type: "loading",
                content: \`新增\${${type}Name}中...\`,
                duration: 0,
            })
            return onMutate?.(variables)
        },
        onSuccess(data, variables, context) {
            message.open({
                key,
                type: "success",
                content: \`新增\${${type}Name}成功\`,
            })
            return onSuccess?.(data, variables, context)
        },
        onError(error, variables, context) {
            message.open({
                key,
                type: "error",
                content: \`新增\${${type}Name}失败\`,
            })
            return onError?.(error, variables, context)
        },
        onSettled(data, error, variables, context) {
            queryClient.invalidateQueries({ queryKey: ["query-${type2}"] })
            return onSettled?.(data, error, variables, context)
        },
        ...rest,
    })
}
`

    if (items.includes("add")) await writeFile(join(hook, `useAdd${type}.ts`), useAdd)

    const useUpdate = `import { useId } from "react"
import { UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query"

import { ${type}, ${type}Name } from "@/apis/query${type}"
import { Update${type}Params, update${type} } from "@/apis/update${type}"

export interface UseUpdate${type}Params<TContext = never>
    extends Omit<UseMutationOptions<${type}, Error, Update${type}Params, TContext>, "mutationFn"> {}

export function useUpdate${type}<TContext = never>({ onMutate, onSuccess, onError, onSettled, ...rest }: UseUpdate${type}Params<TContext> = {}) {
    const key = useId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: update${type},
        onMutate(variables) {
            message.open({
                key,
                type: "loading",
                content: \`更新\${${type}Name}中...\`,
                duration: 0,
            })
            return onMutate?.(variables)
        },
        onSuccess(data, variables, context) {
            message.open({
                key,
                type: "success",
                content: \`更新\${${type}Name}成功\`,
            })
            return onSuccess?.(data, variables, context)
        },
        onError(error, variables, context) {
            message.open({
                key,
                type: "error",
                content: \`更新\${${type}Name}失败\`,
            })
            return onError?.(error, variables, context)
        },
        onSettled(data, error, variables, context) {
            queryClient.invalidateQueries({ queryKey: ["get-${type2}", variables.id] })
            queryClient.invalidateQueries({ queryKey: ["query-${type2}"] })
            return onSettled?.(data, error, variables, context)
        },
        ...rest,
    })
}
`

    if (items.includes("update")) await writeFile(join(hook, `useUpdate${type}.ts`), useUpdate)

    const useDelete = `import { useId } from "react"
import { UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query"

import { Delete${type}Params, delete${type} } from "@/apis/delete${type}"
import { ${type}, ${type}Name } from "@/apis/query${type}"

export interface UseDelete${type}Params<TContext = never>
    extends Omit<UseMutationOptions<${type}, Error, Delete${type}Params, TContext>, "mutationFn"> {}

export function useDelete${type}<TContext = never>({ onMutate, onSuccess, onError, onSettled, ...rest }: UseDelete${type}Params<TContext> = {}) {
    const key = useId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: delete${type},
        onMutate(variables) {
            message.open({
                key,
                type: "loading",
                content: \`删除\${${type}Name}中...\`,
                duration: 0,
            })
            return onMutate?.(variables)
        },
        onSuccess(data, variables, context) {
            message.open({
                key,
                type: "success",
                content: \`删除\${${type}Name}成功\`,
            })
            return onSuccess?.(data, variables, context)
        },
        onError(error, variables, context) {
            message.open({
                key,
                type: "error",
                content: \`删除\${${type}Name}失败\`,
            })
            return onError?.(error, variables, context)
        },
        onSettled(data, error, variables, context) {
            queryClient.invalidateQueries({ queryKey: ["query-${type2}"] })
            return onSettled?.(data, error, variables, context)
        },
        ...rest,
    })
}
`

    if (items.includes("delete")) await writeFile(join(hook, `useDelete${type}.ts`), useDelete)
}
