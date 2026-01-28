import { copyFile, mkdir, readdir, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"

import consola from "consola"
import inquirer from "inquirer"
import { execAsync, setDefaultOptions, spawnAsync } from "soda-nodejs"

import { readPackageJson } from "./readPackageJson"
import { verdaccio } from "./verdaccio"
import { writePackageJson } from "./writePackageJson"

const script = `// @ts-check

import { spawn, spawnSync } from "node:child_process"
import { readdir, rename, rm } from "node:fs/promises"
import { join } from "node:path"
import { styleText } from "node:util"

async function main() {
    const dir = await readdir(".")

    if (!dir.includes(".env.local")) {
        console.log(styleText("redBright", ".env.local 文件不存在"))
        process.exit(1)
    }

    spawnSync("pm2 stop gdm", { shell: true, stdio: "inherit" })

    spawnSync("rimraf geshu-docker-management", { shell: true, stdio: "inherit" })

    spawnSync("7z x gdm.zip", { shell: true, stdio: "inherit" })

    await rename(".gdm", "geshu-docker-management")

    await rename(".env.local", "geshu-docker-management/.env.local")

    spawnSync("npm install --registry http://localhost:4873", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

    const commitsDir = join("geshu-docker-management", "prisma-mirror", "all_commits")

    const dir2 = await readdir(commitsDir)

    for (const item of dir2) {
        const dir3 = await readdir(join(commitsDir, item))
        for (const item2 of dir3) {
            const dir4 = await readdir(join(commitsDir, item, item2))
            for (const item3 of dir4) {
                spawnSync(\`gzip \${item3}\`, { cwd: join(commitsDir, item, item2), shell: true, stdio: "inherit" })
            }
        }
    }

    const server = spawn("npx", ["serve", "prisma-mirror", "-l", "8787"], { cwd: "geshu-docker-management", stdio: "inherit" })

    await new Promise(resolve => setTimeout(resolve, 10000))

    spawnSync("npx cross-env PRISMA_ENGINES_MIRROR=http://127.0.0.1:8787 PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 prisma generate", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

    spawnSync("npx dotenv -e .env.local -- npx cross-env PRISMA_ENGINES_MIRROR=http://127.0.0.1:8787 PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 prisma db push", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

    server.kill("SIGTERM")

    await new Promise(resolve => server.on("exit", resolve))

    spawnSync("npm run build", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

    spawnSync("pm2 restart gdm", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

    spawnSync("pm2 save", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

    spawnSync("rimraf gdm.zip", { shell: true, stdio: "inherit" })

    await rm(import.meta.filename)

    console.log(styleText("greenBright", "更新完成"))
}

main()
`

export async function gdm() {
    const dir = await readdir(".")

    if (dir.includes(".gdm")) {
        consola.warn(".gdm 文件夹已存在")
        process.exit(1)
    }

    setDefaultOptions(options => ({
        ...options,
        shell: true,
        stdio: "inherit",
    }))

    await spawnAsync(`gitpick 1adybug/geshu-docker-management .gdm`)

    const packageJson = await readPackageJson(".gdm")

    packageJson.overrides ??= {}

    packageJson.overrides.xlsx = "npm:xlsx@0.20.3"

    await writePackageJson({ data: packageJson, dir: ".gdm" })

    await spawnAsync("rimraf package-lock.json", { cwd: ".gdm" })

    await mkdir(".gdm/npm-cache", { recursive: true })

    interface Answer {
        registry: string
    }

    const { registry } = await inquirer.prompt<Answer>({
        type: "input",
        name: "registry",
        message: "请输入 verdaccio 的地址",
        default: "http://localhost:4873",
    })

    consola.start(`正在安装依赖，registry: ${registry}`)

    await spawnAsync(`npm install --registry ${registry} --cache npm-cache`, { cwd: ".gdm" })

    consola.success("依赖安装完成")

    await spawnAsync("npx next --version", { cwd: ".gdm" })

    const version = (await execAsync("npx next --version", { cwd: ".gdm" })).replace(/^Next\.js v/, "")

    const nextPackages = ["swc-linux-x64-gnu", "swc-linux-x64-musl", "swc-win32-x64-msvc"]

    for (const pkg of nextPackages) {
        consola.start(`正在缓存 @next/${pkg}`)
        const response = await fetch(new URL(`@next/${pkg}/-/${pkg}-${version}.tgz`, registry))
        await response.blob()
        consola.success(`缓存 @next/${pkg} 完成`)
    }

    await spawnAsync("npx prisma generate", { cwd: ".gdm" })

    const prismaPlatforms = [
        "windows",
        "debian-openssl-1.0.x",
        "debian-openssl-1.1.x",
        "debian-openssl-3.0.x",
        "rhel-openssl-1.0.x",
        "rhel-openssl-1.1.x",
        "rhel-openssl-3.0.x",
    ] as const

    const prismaEngineDir = join(".gdm", "node_modules", "@prisma", "engines")

    for (const platform of prismaPlatforms) {
        consola.start(`正在缓存 ${platform} 引擎`)
        const version = await execAsync(`npx cross-env PRISMA_CLI_BINARY_TARGETS="${platform}" prisma -v`, { cwd: ".gdm" })
        const match = version.match(/^Default Engines Hash +: ([a-z0-9]{40})$/m)
        if (!match) throw new Error("无法获取引擎 hash")
        const hash = match[1]

        const prismaMirrorDir = join(".gdm", "prisma-mirror", "all_commits", hash, platform)

        await mkdir(prismaMirrorDir, { recursive: true })

        await copyFile(
            join(prismaEngineDir, platform === "windows" ? "query_engine-windows.dll.node" : `libquery_engine-${platform}.so.node`),
            join(prismaMirrorDir, platform === "windows" ? "query_engine.dll.node" : `libquery_engine.so.node`),
        )

        await copyFile(
            join(prismaEngineDir, platform === "windows" ? "schema-engine-windows.exe" : `schema-engine-${platform}`),
            join(prismaMirrorDir, platform === "windows" ? "schema-engine.exe" : `schema-engine`),
        )

        consola.success(`缓存 ${platform} 引擎完成`)
    }

    await spawnAsync("rimraf node_modules", { cwd: ".gdm" })

    await spawnAsync("rimraf package-lock.json", { cwd: ".gdm" })

    await spawnAsync("7z a gdm.zip .gdm")

    await spawnAsync("rimraf .gdm")

    await mkdir(".gdm", { recursive: true })

    await rename("gdm.zip", ".gdm/gdm.zip")

    await writeFile(".gdm/gdm.mjs", script)

    interface Answer2 {
        buildVerdaccio: boolean
    }

    const { buildVerdaccio } = await inquirer.prompt<Answer2>({
        type: "confirm",
        name: "buildVerdaccio",
        message: "是否需要打包 verdaccio",
        default: true,
    })

    if (!buildVerdaccio) return

    consola.start("正在打包 verdaccio")

    await verdaccio()

    consola.success("打包完成")
}
