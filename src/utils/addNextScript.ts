import { mkdir, writeFile } from "fs/promises"
import { addDependency } from "./addDependency"
import { existsSync } from "fs"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

const script = `import { readFile } from "fs/promises"
import { checkPort } from "get-port-please"
import { createServer as createHttpServer } from "http"
import { createServer as createHttpsServer } from "https"
import next from "next"
import { join } from "path"

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
        package: ["cross-env", "get-port-please"],
        type: "devDependencies"
    })
    await mkdir("scripts", { recursive: true })
    const existed = existsSync("scripts/start.js")
    if (!existed) await writeFile("scripts/start.js", script, "utf-8")
    else writeFile("scripts/start2.js", script, "utf-8")
    const packageJson = await readPackageJson()
    packageJson.scripts ??= {}
    if (packageJson.scripts.start) packageJson.scripts.start2 = `cross-env PEM_PATH="" PORT="" node scripts/start${existed ? "2" : ""}.js`
    else packageJson.scripts.start = `cross-env PEM_PATH="" PORT="" node scripts/start${existed ? "2" : ""}.js`
    await writePackageJson({ data: packageJson })
}
