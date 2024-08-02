import { Registry } from "@src/constant"

declare global {
    var __ZIXULU_REGISTRY__: string | undefined
    var __ZIXULU_PROXY__: boolean | undefined
}

export type GlobalOptions = {
    registry?: string
    proxy?: boolean
}

export function setGlobal({ registry, proxy }: GlobalOptions) {
    if (Object.keys(Registry).includes(registry!)) global.__ZIXULU_REGISTRY__ = Registry[registry as keyof typeof Registry]
    else global.__ZIXULU_REGISTRY__ = registry
    global.__ZIXULU_PROXY__ = !!proxy
}
