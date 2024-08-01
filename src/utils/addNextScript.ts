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

main()`

const script2 = `// @ts-check
import { config } from "dotenv"
import { readFile } from "fs/promises"
import { checkPort } from "get-port-please"
import { createServer as createHttpServer } from "http"
import { createServer as createHttpsServer } from "https"
import next from "next"
import { join } from "path"

config()

async function main() {
    const PEM_PATH = process.env.PEM_PATH
    const https = !!PEM_PATH
    const PORT = process.env.PORT ? Number(process.env.PORT) : https ? 443 : 80
    if (!checkPort(PORT)) throw new Error(\`无效的端口号: \${PORT}\`)
    const app = next({ experimentalHttpsServer: https })
    const handle = app.getRequestHandler()
    await app.prepare()
    if (!https) return createHttpServer((request, response) => handle(request, response)).listen(PORT)
    const key = await readFile(join(PEM_PATH, "privkey.pem"), "utf8")
    const cert = await readFile(join(PEM_PATH, "cert.pem"), "utf8")
    const ca = await readFile(join(PEM_PATH, "chain.pem"), "utf8")
    createHttpsServer({ key, cert, ca }, (request, response) => handle(request, response)).listen(PORT)
}

main()`

export async function addNextScript() {
    await addDependency({
        package: ["dotenv", "get-port-please"],
        type: "devDependencies"
    })
    await mkdir("scripts", { recursive: true })
    await writeFile("scripts/start.mjs", script, "utf-8")
    consola.success("已添加 scripts/start.js")
    await writeFile("scripts/server.mjs", script2, "utf-8")
    consola.success("已添加 scripts/server.js")
    let env = ""
    try {
        env = await readFile(".env", "utf-8")
    } catch (error) {}
    if (/^PEM_PATH=/m.test(env)) env += '\nPEM_PATH=""'
    if (/^PORT=/m.test(env)) env += '\nPORT=""'
    if (/^CORE=/m.test(env)) env += '\nCORE=""'
    await writeFile(".env", env, "utf-8")
    const packageJson = await readPackageJson()
    packageJson.scripts ??= {}
    packageJson.scripts.start = "node scripts/start.mjs"
    await writePackageJson({ data: packageJson })
    consola.success("已添加启动命令 start")
    await installDependceny()
    return getCommitMessage(CommitType.feature, "添加启动命令")
}
