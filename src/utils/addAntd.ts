import { mkdir, readdir, writeFile } from "fs/promises"
import { join } from "path"
import consola from "consola"

import { addDependency } from "./addDependency"
import { readPackageJson } from "./readPackageJson"

/**
 * 添加 antd 相关配置
 * 包括安装依赖、创建必要组件等
 */
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

import { FC, ReactNode } from "react"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"

export interface AntdNextRegistryProps {
    children?: ReactNode
}

const AntdNextRegistry: FC<AntdNextRegistryProps> = props => {
    const { children } = props

    return (
        <AntdRegistry hashPriority="high">
            <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
        </AntdRegistry>
    )
}

export default AntdNextRegistry
`,
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
        <StyleProvider hashPriority="high">
            <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
        </StyleProvider>
    )
}

export default AntdRegistry
`,
        )
    }
    consola.success("添加 antd 配置成功")
}
