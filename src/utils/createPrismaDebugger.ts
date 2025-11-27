import { copyFile, mkdir, readdir, rm, writeFile } from "fs/promises"
import { join } from "path"

import { spawnAsync, zip } from "soda-nodejs"

const json = {
    name: "prisma-debugger",
    version: "1.0.0",
    main: "index.ts",
    type: "module",
    dependencies: {},
    devDependencies: {},
}

const schema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
    provider               = "prisma-client"
    output                 = "generated"
    runtime                = "nodejs"
    moduleFormat           = "esm"
    generatedFileExtension = "ts"
    importFileExtension    = ""
    binaryTargets          = ["windows", "debian-openssl-1.0.x", "debian-openssl-1.1.x", "debian-openssl-3.0.x", "rhel-openssl-1.0.x", "rhel-openssl-1.1.x", "rhel-openssl-3.0.x"]
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

model User {
    id        String   @id @default(uuid()) // 主键ID
    name      String
}
`

const index = `import { PrismaClient } from "./prisma/generated/client"

const prisma = new PrismaClient()
`

const env = `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres`

export async function createPrismaDebugger() {
    try {
        await mkdir("prisma-debugger/prisma", { recursive: true })
        await writeFile("prisma-debugger/package.json", JSON.stringify(json, null, 4), "utf-8")

        await spawnAsync("npm i @prisma/client", {
            cwd: "prisma-debugger",
            stdio: "inherit",
            shell: true,
        })

        await spawnAsync("npm i @types/node cross-env prisma tsx typescript --save-dev", {
            cwd: "prisma-debugger",
            stdio: "inherit",
            shell: true,
        })

        await writeFile("prisma-debugger/prisma/schema.prisma", schema, "utf-8")

        await spawnAsync("npx prisma generate", {
            cwd: "prisma-debugger",
            stdio: "inherit",
            shell: true,
        })

        const dir = await readdir("prisma-debugger/prisma/generated")

        for (const item of dir) {
            if (item.endsWith(".node")) await copyFile(join("prisma-debugger/prisma/generated", item), join("prisma-debugger/node_modules/prisma", item))
        }

        await writeFile("prisma-debugger/index.ts", index, "utf-8")
        await writeFile("prisma-debugger/.env", env, "utf-8")

        await zip({
            input: "prisma-debugger",
            output: "prisma-debugger.zip",
        })
    } catch (error) {
        await rm("prisma-debugger", { recursive: true })
    }

    await rm("prisma-debugger", { recursive: true })
}
