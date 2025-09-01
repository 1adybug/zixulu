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
    await addDependency({ package: ["@ant-design/icons", "@ant-design/v5-patch-for-react-19", "antd"] })
    const dir = await readdir(".")
    const componentDir = dir.includes("src") ? "src/components" : "components"
    await mkdir(componentDir, { recursive: true })
    const packageJson = await readPackageJson()

    if (packageJson.dependencies.next) {
        await addDependency({ package: "@ant-design/nextjs-registry" })
    } else {
        await addDependency({ package: "@ant-design/cssinjs" })
    }

    if (packageJson.dependencies.next) {
        await addDependency({ package: "@ant-design/nextjs-registry" })
        await writeFile(
            join(componentDir, "Registry.tsx"),
            `"use client"

import { FC, ReactNode } from "react"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"

import "@ant-design/v5-patch-for-react-19"

export interface RegistryProps {
    children?: ReactNode
}

const Registry: FC<RegistryProps> = ({ children }) => {

    return (
        <AntdRegistry hashPriority="high">
            <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
        </AntdRegistry>
    )
}

export default Registry
`,
        )
    } else {
        await writeFile(
            join(componentDir, "Registry.tsx"),
            `import { StyleProvider } from "@ant-design/cssinjs"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import { FC, ReactNode } from "react"

import "@ant-design/v5-patch-for-react-19"

export interface RegistryProps {
    children?: ReactNode
}

const Registry: FC<RegistryProps> = ({ children }) => {

    return (
        <StyleProvider hashPriority="high">
            <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
        </StyleProvider>
    )
}

export default Registry
`,
        )
    }
    consola.success("添加 antd 配置成功")
}
