import { writeFile } from "fs/promises"

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
