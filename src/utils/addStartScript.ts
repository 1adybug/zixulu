import { mkdir, readFile, writeFile } from "node:fs/promises"

import consola from "consola"

import { CommitType } from "@/constant"

import { addDependency } from "./addDependency"
import { getCommitMessage } from "./getCommitMessage"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

const script = `// @ts-check
import { spawn } from "node:child_process"
import { config } from "dotenv"
import { readFile } from "node:fs/promises"
import { cpus } from "node:os"

config()

async function main() {
    let core = parseInt(process.env.CORE || "1")
    if (!Number.isInteger(core)) core = 1
    if (core < 1) core = 1
    if (core > cpus().length) core = cpus().length
    const packageJson = JSON.parse(await readFile("package.json", "utf-8"))

    spawn(\`pm2 start scripts/server.mjs --name \${packageJson.name} -i \${core}\`, { shell: true, stdio: "inherit" })
}

main()
`

const expressScript = `// @ts-check
import compression from "compression"
import cors from "cors"
import { config } from "dotenv"
import express from "express"
import { readFileSync } from "node:fs"
import { createServer as createHttpServer } from "node:http"
import { createServer as createHttpsServer } from "node:https"
import morgan from "morgan"
import { join, resolve } from "node:path"

config()

function createServer() {
    const app = express()
    app.disable("x-powered-by")
    app.use(compression())
    app.use(cors())
    app.use(morgan("tiny"))

    const PEM_PATH = process.env.PEM_PATH
    const HTTPS = !!PEM_PATH
    const PORT = process.env.PORT ? Number(process.env.PORT) : HTTPS ? 443 : 80
    const HOSTNAME = process.env.HOSTNAME?.trim() || undefined

    if (!HTTPS) {
        createHttpServer(app).listen(PORT, HOSTNAME)
    } else {
        const key = readFileSync(join(PEM_PATH, "privkey.pem"), "utf8")
        const cert = readFileSync(join(PEM_PATH, "cert.pem"), "utf8")
        const ca = readFileSync(join(PEM_PATH, "chain.pem"), "utf8")
        createHttpsServer({ key, cert, ca }, app).listen(PORT, HOSTNAME)
    }

    return app
}

async function main() {
    const ROOT = process.env.ROOT || "dist"
    if (!!process.env.BASE && !process.env.BASE.startsWith("/")) throw new Error("BASE 必须以 / 开头")
    const BASE = process.env.BASE || "/"

    const server = createServer()

    server.use(\`\${BASE.replace(/\\/+$/, "")}/\`, express.static(ROOT))

    server.get(\`\${BASE.replace(/\\/+$/, "")}/*\`, async (request, response) => response.sendFile(resolve(ROOT, "index.html")))

    if (BASE !== "/") server.get("/", async (request, response) => response.redirect(BASE))
}

main()
`

const nextScript = `// @ts-check
import compression from "compression"
import cors from "cors"
import { config } from "dotenv"
import express from "express"
import { readFileSync } from "node:fs"
import { createServer as createHttpServer } from "node:http"
import { createServer as createHttpsServer } from "node:https"
import morgan from "morgan"
import next from "next"
import { join } from "node:path"

config()

function createServer() {
    const app = express()
    app.disable("x-powered-by")
    app.use(compression())
    app.use(cors())
    app.use(morgan("tiny"))

    const PEM_PATH = process.env.PEM_PATH
    const HTTPS = !!PEM_PATH
    const PORT = process.env.PORT ? Number(process.env.PORT) : HTTPS ? 443 : 80
    const HOSTNAME = process.env.HOSTNAME?.trim() || undefined

    if (!HTTPS) {
        createHttpServer(app).listen(PORT, HOSTNAME)
    } else {
        const key = readFileSync(join(PEM_PATH, "privkey.pem"), "utf8")
        const cert = readFileSync(join(PEM_PATH, "cert.pem"), "utf8")
        const ca = readFileSync(join(PEM_PATH, "chain.pem"), "utf8")
        createHttpsServer({ key, cert, ca }, app).listen(PORT, HOSTNAME)
    }

    return app
}

async function main() {
    const PEM_PATH = process.env.PEM_PATH
    const HTTPS = !!PEM_PATH

    const app = next({ experimentalHttpsServer: HTTPS })
    const handle = app.getRequestHandler()
    await app.prepare()

    const server = createServer()
    server.all("*", (request, response) => handle(request, response))
}

main()
`

const scripts = {
    express: expressScript,
    next: nextScript,
}

/**
 * 添加启动脚本配置选项
 */
export type AddStartScriptOptions = {
    /** 服务器类型：express 或 next */
    type: keyof typeof scripts
    /** SSL 证书路径 */
    pemPath?: string
    /** 服务器端口 */
    port?: string
    /** PM2 实例数量 */
    core?: string
    /** 服务器主机名 */
    hostname?: string
}

/**
 * 添加生产环境启动脚本
 * 支持 Express 和 Next.js 服务器
 * 配置 PM2 多进程管理
 * 支持 HTTPS
 *
 * @param options 配置选项
 * @returns commit message
 */
export async function addStartScript({ type, pemPath, port, core, hostname }: AddStartScriptOptions) {
    await addDependency({
        package: ["@types/compression", "@types/cors", "@types/express", "@types/morgan", "@types/node", "compression", "cors", "dotenv", "express", "morgan"],
        type: "devDependencies",
    })
    await mkdir("scripts", { recursive: true })
    await writeFile("scripts/start.mjs", script, "utf-8")
    consola.success("已添加 scripts/start.js")
    await writeFile("scripts/server.mjs", scripts[type], "utf-8")
    consola.success("已添加 scripts/server.js")
    let env = ""

    try {
        env = await readFile(".env", "utf-8")
    } catch {
        /* empty */
    }

    // 添加证书目录
    if (/^ *PEM_PATH=/m.test(env)) env = env.replace(/^ *PEM_PATH=.*$/m, `PEM_PATH="${pemPath ?? ""}"`)
    else env += `\nPEM_PATH="${pemPath ?? ""}"`

    // 添加端口号
    if (/^ *PORT=/m.test(env)) env = env.replace(/^ *PORT=.*$/m, `PORT="${port ?? ""}"`)
    else env += `\nPORT="${port ?? ""}"`

    // 添加实例数
    if (/^ *CORE=/m.test(env)) env = env.replace(/^ *CORE=.*$/m, `CORE="${core ?? ""}"`)
    else env += `\nCORE="${core ?? ""}"`

    // 添加主机
    if (/^ *HOSTNAME=/m.test(env)) env = env.replace(/^ *HOSTNAME=.*$/m, `HOSTNAME="${hostname || ""}"`)
    else env += `\nHOSTNAME="${hostname || ""}"`

    await writeFile(".env", env, "utf-8")
    const packageJson = await readPackageJson()
    packageJson.scripts ??= {}
    packageJson.scripts.start = "node scripts/start.mjs"
    await writePackageJson({ data: packageJson })
    consola.success("已添加启动命令 start")
    await installDependceny()
    return getCommitMessage(CommitType.feature, "添加启动命令")
}
