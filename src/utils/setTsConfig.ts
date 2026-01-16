import { exit } from "node:process"

import consola from "consola"

import { readTsConfig } from "./readTsConfig"
import { writeTsConfig } from "./writeTsConfig"

export enum Target {
    ES2015 = "ES2015",
    ES2016 = "ES2016",
    ES2017 = "ES2017",
    ES2018 = "ES2018",
    ES2019 = "ES2019",
    ES2020 = "ES2020",
    ES2021 = "ES2021",
    ES2022 = "ES2022",
    ES2023 = "ES2023",
    ES3 = "ES3",
    ES5 = "ES5",
    ES6 = "ES6",
    ESNext = "ESNext",
}

export enum Module {
    AMD = "AMD",
    CommonJS = "CommonJS",
    ES2015 = "ES2015",
    ES2020 = "ES2020",
    ES2022 = "ES2022",
    ES6 = "ES6",
    ESNext = "ESNext",
    Node16 = "Node16",
    NodeNext = "NodeNext",
    None = "None",
    System = "System",
    UMD = "UMD",
}

export enum ModuleResolution {
    Bundler = "Bundler",
    Classic = "Classic",
    Node = "Node",
    Node10 = "Node10",
    Node16 = "Node16",
    NodeNext = "NodeNext",
}

export async function setTsConfig(key: string, value?: any) {
    const tsconfig = await readTsConfig()

    if (value === undefined) delete tsconfig.compilerOptions[key]
    else {
        switch (key) {
            case "target": {
                const t = Object.values(Target).find(t => t.toLowerCase() === value.trim().toLowerCase())

                if (!t) {
                    consola.fail("无效的 target 选项")
                    exit()
                }

                tsconfig.compilerOptions.target = t
                break
            }
            case "module": {
                const m = Object.values(Module).find(m => m.toLowerCase() === value.trim().toLowerCase())

                if (!m) {
                    consola.fail("无效的 module 选项")
                    exit()
                }

                tsconfig.compilerOptions.module = m
                break
            }
            case "moduleResolution": {
                const mr = Object.values(ModuleResolution).find(mr => mr.toLowerCase() === value.trim().toLowerCase())

                if (!mr) {
                    consola.fail("无效的 moduleResolution 选项")
                    exit()
                }

                tsconfig.compilerOptions.moduleResolution = mr
                break
            }
            case "noEmit":
                tsconfig.compilerOptions.noEmit = !!value
                break
            default:
                consola.fail(`暂不支持 ${key} 项`)
                exit()
        }
    }

    await writeTsConfig(tsconfig)
    consola.success(`修改 ${key} 成功`)
}
