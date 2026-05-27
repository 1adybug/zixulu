import { writeFile } from "node:fs/promises"

import { CommitType } from "@/constant"

import { type PackageVersion, addDependency } from "./addDependency"
import { addScript } from "./addScript"
import { getCommitMessage } from "./getCommitMessage"
import { installDependceny } from "./installDependceny"

export async function addEslint() {
    await writeFile("eslint.config.mjs", `// eslint-disable-next-line n/no-unpublished-import\nexport { default } from "@1adybug/eslint"\n`)

    const packages: (string | PackageVersion)[] = [{ packageName: "eslint", versionRange: "^9" }, "@1adybug/eslint"]

    await addDependency({
        package: packages,
        type: "devDependencies",
    })

    await installDependceny()
    await addScript({ lint: "eslint ." })
    return getCommitMessage(CommitType.feat, "add eslint")
}
