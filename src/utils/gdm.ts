import { copyFile, mkdir, readdir, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"

import consola from "consola"
import { execAsync, setDefaultOptions, spawnAsync } from "soda-nodejs"

import { readPackageJson } from "./readPackageJson"
import { verdaccio } from "./verdaccio"
import { writePackageJson } from "./writePackageJson"

const script = `// @ts-check

import { spawnSync } from "child_process"
import { readdirSync, renameSync, rmSync } from "fs"
import { styleText } from "util"

const dir = readdirSync(".")

if (!dir.includes(".env.local")) {
    console.log(styleText("redBright", ".env.local 文件不存在"))
    process.exit(1)
}

spawnSync("pm2 stop gdm", { shell: true, stdio: "inherit" })

spawnSync("rimraf geshu-docker-management", { shell: true, stdio: "inherit" })

spawnSync("7z x geshu-docker-management.zip", { shell: true, stdio: "inherit" })

renameSync(".env.local", "geshu-docker-management/.env.local")

spawnSync("npm install --registry http://localhost:4873", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

spawnSync("npm run build", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

spawnSync("pm2 restart gdm", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

spawnSync("pm2 save", { cwd: "geshu-docker-management", shell: true, stdio: "inherit" })

spawnSync("rimraf geshu-docker-management.zip", { shell: true, stdio: "inherit" })

spawnSync("rimraf geshu-docker-management", { shell: true, stdio: "inherit" })

rmSync(import.meta.filename)

console.log(styleText("greenBright", "更新完成"))
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

    await spawnAsync("npm install --registry http://localhost:4873 --cache npm-cache", { cwd: ".gdm" })

    const version = (await execAsync("npx next --version", { cwd: ".gdm" })).replace(/^Next\.js v/, "")

    const packages = ["swc-linux-x64-gnu", "swc-linux-x64-musl", "swc-win32-x64-msvc"]

    for (const pkg of packages) {
        const filename = (await execAsync(`npm pack @next/${pkg}@${version} --registry http://localhost:4873`, { cwd: ".gdm" })).trim()
        await spawnAsync(`rimraf ${filename}`, { cwd: ".gdm" })
    }

    await spawnAsync("rimraf npm-cache", { cwd: ".gdm" })

    await spawnAsync("npx prisma generate", { cwd: ".gdm" })

    const dir2 = await readdir(join(".gdm", "prisma", "generated"))

    for (const item of dir2) {
        if (item.endsWith(".node")) await copyFile(join(".gdm", "prisma", "generated", item), join(".gdm", "prisma", item))
    }

    await spawnAsync("rimraf node_modules", { cwd: ".gdm" })

    await spawnAsync("7z a geshu-docker-management.zip .gdm")

    await spawnAsync("rimraf .gdm")

    await mkdir(".gdm", { recursive: true })

    await rename("geshu-docker-management.zip", ".gdm/geshu-docker-management.zip")

    await writeFile(".gdm/gdm.mjs", script)

    await verdaccio()
}
