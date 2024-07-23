import consola from "consola"
import { setTsConfig } from "./setTsConfig"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export async function vite() {
    consola.start("开始设置 vite 配置")
    await setTsConfig("noUnusedLocals")
    await setTsConfig("noUnusedParameters")
    const pkg = await readPackageJson()
    pkg.scripts.dev += " --host"
    await writePackageJson({ data: pkg })
    consola.success("设置 vite 配置成功")
}
