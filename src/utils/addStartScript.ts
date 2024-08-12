import consola from "consola"
import { mkdir, readFile, writeFile } from "fs/promises"
import { addDependency } from "./addDependency"
import { installDependceny } from "./installDependceny"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"
import { getCommitMessage } from "./getCommitMessage"
import { CommitType } from "@src/constant"

const script = `// @ts-check
import { spawn } from "child_process"
import { config } from "dotenv"
import { readFile } from "fs/promises"
import { cpus } from "os"

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
import { readFile } from "fs/promises"
import { createServer as createHttpServer } from "http"
import { createServer as createHttpsServer } from "https"
import { join, resolve } from "path"
import { readFile } from "fs/promises"
import morgan from "morgan"

config()

export async function createServer(app) {
    app.disable("x-powered-by")
    app.use(compression())
    app.use(cors())
    app.use(morgan("tiny"))

    const PEM_PATH = process.env.PEM_PATH
    const HTTPS = !!PEM_PATH
    const PORT = process.env.PORT ? Number(process.env.PORT) : HTTPS ? 443 : 80
    const HOSTNAME = process.env.HOSTNAME

    if (!HTTPS) return createHttpServer(app).listen(PORT, HOSTNAME)

    const key = await readFile(join(PEM_PATH, "privkey.pem"), "utf8")
    const cert = await readFile(join(PEM_PATH, "cert.pem"), "utf8")
    const ca = await readFile(join(PEM_PATH, "chain.pem"), "utf8")

    createHttpsServer({ key, cert, ca }, app).listen(PORT, HOSTNAME)
}


async function main() {
    const PEM_PATH = process.env.PEM_PATH
    const https = !!PEM_PATH
    const PORT = process.env.PORT ? Number(process.env.PORT) : https ? 443 : 80
    const HOSTNAME = process.env.HOSTNAME
    const ROOT = process.env.ROOT || "dist"
    if (!!process.env.BASE && !process.env.BASE.startsWith("/")) throw new Error("BASE 必须以 / 开头")
    const BASE = process.env.BASE || "/"

    const app = express()

    app.use(cors())

    app.use(\`\${BASE.replace(/\\/+$/, "")}/\`, express.static(ROOT))

    app.get(\`\${BASE.replace(/\\/+$/, "")}/*\`, async (request, response) => response.sendFile(resolve(ROOT, "index.html")))

    if (BASE !== "/") app.get("/", async (request, response) => response.redirect(BASE))

    if (!https) return createHttpServer(app).listen(PORT, HOSTNAME)

    const key = await readFile(join(PEM_PATH, "privkey.pem"), "utf8")
    const cert = await readFile(join(PEM_PATH, "cert.pem"), "utf8")
    const ca = await readFile(join(PEM_PATH, "chain.pem"), "utf8")
    createHttpsServer({ key, cert, ca }, app).listen(PORT, HOSTNAME)
}

main()
`

const nextScript = `// @ts-check
import { config } from "dotenv"
import { readFile } from "fs/promises"
import { checkPort } from "get-port-please"
import { createServer as createHttpServer } from "http"
import { createServer as createHttpsServer } from "https"
import next from "next"
import { join } from "path"
import compression from "compression"
import cors from "cors"
import express from "express"


import morgan from "morgan"

config()


export async function createServer(app: Express) {
    app.disable("x-powered-by")
    app.use(compression())
    app.use(cors())
    app.use(morgan("tiny"))

    const PEM_PATH = process.env.PEM_PATH
    const HTTPS = !!PEM_PATH
    const PORT = process.env.PORT ? Number(process.env.PORT) : HTTPS ? 443 : 80
    const HOSTNAME = process.env.HOSTNAME

    if (!HTTPS) return createHttpServer(app).listen(PORT, HOSTNAME)

    const key = await readFile(join(PEM_PATH, "privkey.pem"), "utf8")
    const cert = await readFile(join(PEM_PATH, "cert.pem"), "utf8")
    const ca = await readFile(join(PEM_PATH, "chain.pem"), "utf8")

    createHttpsServer({ key, cert, ca }, app).listen(PORT, HOSTNAME)
}

async function main() {
    const PEM_PATH = process.env.PEM_PATH
    const HTTPS = !!PEM_PATH
    const PORT = process.env.PORT ? Number(process.env.PORT) : HTTPS ? 443 : 80
    const HOSTNAME = process.env.HOSTNAME
    if (!checkPort(PORT)) throw new Error(\`无效的端口号: \${PORT}\`)
    
    const app = next({ experimentalHttpsServer: HTTPS })
    const handle = app.getRequestHandler()
    await app.prepare()

    if (!HTTPS) return createHttpServer((request, response) => handle(request, response)).listen(PORT, HOSTNAME)

    const key = await readFile(join(PEM_PATH, "privkey.pem"), "utf8")
    const cert = await readFile(join(PEM_PATH, "cert.pem"), "utf8")
    const ca = await readFile(join(PEM_PATH, "chain.pem"), "utf8")

    createHttpsServer({ key, cert, ca }, (request, response) => handle(request, response)).listen(PORT, HOSTNAME)
}

main()
`

const scripts = {
    express: expressScript,
    next: nextScript
}

export type AddStartScriptOptions = {
    type: keyof typeof scripts
    pemPath?: string
    port?: string
    core?: string
    hostname?: string
}

export async function addStartScript({ type, pemPath, port, core, hostname }: AddStartScriptOptions) {
    await addDependency({
        package: ["cors", "dotenv", "express", "get-port-please"],
        type: "devDependencies"
    })
    await mkdir("scripts", { recursive: true })
    await writeFile("scripts/start.mjs", script, "utf-8")
    consola.success("已添加 scripts/start.js")
    await writeFile("scripts/server.mjs", scripts[type], "utf-8")
    consola.success("已添加 scripts/server.js")
    let env = ""
    try {
        env = await readFile(".env", "utf-8")
    } catch (error) {}

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
