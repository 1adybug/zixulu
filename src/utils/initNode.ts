import { writeFile } from "node:fs/promises"
import { parse, resolve } from "node:path"

import { spawnAsync } from "soda-nodejs"

import { addDependency } from "./addDependency"
import { addEslint } from "./addEslint"
import { addGitignore } from "./addGitignore"
import { addPrettier } from "./addPrettier"

const { name } = parse(resolve("."))

const packageJson = `{
    "name": "${name}",
    "version": "0.0.1",
    "description": "",
    "main": "index.ts",
    "scripts": {},
    "keywords": [],
    "author": "",
    "license": "ISC",
    "type": "module",
    "dependencies": {}
}
`

const config = `{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "skipLibCheck": true
    }
}
`

export async function initNode() {
    await writeFile("index.ts", "", "utf-8")
    await writeFile("package.json", packageJson, "utf-8")

    await addDependency({
        package: [{ packageName: "@types/node", versionRange: "^24" }, "typescript"],
        type: "devDependencies",
    })

    await writeFile("tsconfig.json", config, "utf-8")

    await addEslint()

    await spawnAsync("git init", { stdio: "inherit", shell: true })

    await addGitignore()

    await addPrettier()
}
