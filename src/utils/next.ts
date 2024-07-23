import consola from "consola"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export async function next() {
    consola.start("开始设置 next 配置")
    const pkg = await readPackageJson()
    pkg.scripts.dev += " --hostname 0.0.0.0 --port 5173"
    await writePackageJson({ data: pkg })
    consola.success("设置 next 配置成功")
}
