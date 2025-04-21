import { writeFile } from "fs/promises"
import { parse, resolve } from "path"

const { name } = parse(resolve("."))

const packageJson = `{
    "name": "${name}",
    "version": "1.0.0",
    "description": "",
    "main": "index.ts",
    "scripts": {},
    "keywords": [],
    "author": "",
    "license": "ISC",
    "type": "module",
    "dependencies": {},
    "devDependencies": {
        "@types/node": "^22.14.1",
        "typescript": "^5.8.3"
    }
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
    await writeFile("tsconfig.json", config, "utf-8")
}
