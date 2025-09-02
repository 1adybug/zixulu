import inquirer from "inquirer"

import { readPackageJson } from "./readPackageJson"
import { sortArrayOrObject } from "./sortArrayOrObject"
import { writePackageJson } from "./writePackageJson"

export type Scripts = Record<string, string>

export async function addScript(scripts: Scripts) {
    const packageJson = await readPackageJson()

    interface Answer {
        replace: boolean
    }

    const keys: string[] = []

    for (const key of Object.keys(scripts)) {
        if (packageJson.scripts[key]) {
            if (scripts[key] === packageJson.scripts[key]) continue
            const { replace } = await inquirer.prompt<Answer>([
                {
                    type: "confirm",
                    name: "replace",
                    message: `${key} 命令已存在 \`${packageJson.scripts[key]}\`，是否替换为 \`${scripts[key]}\``,
                },
            ])
            if (!replace) continue
        }
        keys.push(key)
    }

    keys.forEach(key => (packageJson.scripts[key] = scripts[key]))

    sortArrayOrObject(packageJson.scripts)

    await writePackageJson({ data: packageJson })
}
