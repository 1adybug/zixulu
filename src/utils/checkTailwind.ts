import { getDependcy } from "./getDependcy"

/**
 * 检查项目是否安装了 Tailwind CSS
 * @returns 返回 true 表示已安装 Tailwind CSS，false 表示未安装
 */
export async function checkTailwind() {
    return !!(await getDependcy("tailwindcss"))
}
