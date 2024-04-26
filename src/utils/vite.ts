import consola from "consola"
import { readPackageJson, setTsConfig, writePackageJson } from "."

export async function vite() {
    consola.start("开始设置 vite 配置")
    await setTsConfig("noUnusedLocals")
    await setTsConfig("noUnusedParameters")
    const pkg = await readPackageJson()
    pkg.scripts.dev += " --host"
    await writePackageJson(pkg)
    consola.success("设置 vite 配置成功")
}
