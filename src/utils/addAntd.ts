import consola from "consola"
import { mkdir, readdir, writeFile } from "fs/promises"
import { join } from "path"
import { addDependency } from "./addDependency"
import { readPackageJson } from "./readPackageJson"

export async function addAntd() {
    consola.start("开始添加 antd 配置")
    await addDependency({ package: ["@ant-design/cssinjs", "@ant-design/icons", "antd"] })
    const dir = await readdir(".")
    const componentDir = dir.includes("src") ? "src/components" : "components"
    await mkdir(componentDir, { recursive: true })
    const packageJson = await readPackageJson()
    if (packageJson.dependencies.next) {
        await addDependency({ package: "@ant-design/nextjs-registry" })
        await writeFile(
            join(componentDir, "AntdNextRegistry.tsx"),
            `"use client"

import { StyleProvider } from "@ant-design/cssinjs"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import { FC, ReactNode } from "react"

export type AntdNextRegistryProps = {
    children?: ReactNode
}

const AntdNextRegistry: FC<AntdNextRegistryProps> = props => {
    const { children } = props

    return (
        <AntdRegistry>
            <ConfigProvider locale={zhCN}>
                <StyleProvider hashPriority="high">{children}</StyleProvider>
            </ConfigProvider>
        </AntdRegistry>
    )
}

export default AntdNextRegistry
`
        )
    } else {
        await writeFile(
            join(componentDir, "AntdRegistry.tsx"),
            `import { StyleProvider } from "@ant-design/cssinjs"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import { FC, ReactNode } from "react"

export type AntdRegistryProps = {
    children?: ReactNode
}

const AntdRegistry: FC<AntdRegistryProps> = props => {
    const { children } = props

    return (
        <ConfigProvider locale={zhCN}>
            <StyleProvider hashPriority="high">{children}</StyleProvider>
        </ConfigProvider>
    )
}

export default AntdRegistry
`
        )
    }
    consola.success("添加 antd 配置成功")
}
