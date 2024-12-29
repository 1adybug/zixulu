import { spawnAsync } from "soda-nodejs"

/**
 * 执行 TypeScript 类型检查
 * 使用 tsc --noEmit 命令检查项目中的类型错误
 */
export async function checkType() {
    await spawnAsync("npx tsc --noEmit", { shell: true, stdio: "inherit" })
}
