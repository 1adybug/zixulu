import { writeFile } from "fs/promises"

export type WriteJsonConfig = {
    data: Record<string, any> | any[]
    output: string
}

export async function writeJson({ data, output }: WriteJsonConfig): Promise<void> {
    await writeFile(output, JSON.stringify(data, undefined, 4), "utf-8")
}
