import { Registry } from "@/constant"

declare global {
    /** 全局 npm 镜像源配置地址 */
    var __ZIXULU_REGISTRY__: string | undefined
    /** 是否启用全局代理配置 */
    var __ZIXULU_PROXY__: boolean | undefined
}

export type GlobalConfig = {
    /** npm 镜像源地址 */
    registry?: string
    /** 是否启用代理 */
    proxy?: boolean
}

/**
 * 设置全局配置参数
 * @param param 全局配置对象
 */
export function setGlobalConfig({ registry, proxy }: GlobalConfig) {
    if (Object.keys(Registry).includes(registry!))
        global.__ZIXULU_REGISTRY__ = Registry[registry as keyof typeof Registry]
    else global.__ZIXULU_REGISTRY__ = registry

    global.__ZIXULU_PROXY__ = !!proxy
}
