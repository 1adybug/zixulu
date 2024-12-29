import { writeFile } from "fs/promises"

/**
 * 创建 .browserslistrc 配置文件
 * 用于指定项目支持的浏览器版本范围
 */
export async function createBrowserlistrc() {
    await writeFile(
        ".browserslistrc",
        `chrome >= 87
edge >= 88
firefox >= 78
safari >= 14`,
        "utf-8",
    )
}
