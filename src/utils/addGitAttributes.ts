import { writeFile } from "fs/promises"

export async function addGitAttributes() {
    await writeFile(
        ".gitattributes",
        `# 将所有文本文件在提交到 Git 仓库时，自动转换为 LF 换行符
* text=auto eol=lf`,
        "utf-8",
    )
}
