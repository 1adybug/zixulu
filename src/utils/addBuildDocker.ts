import { copyFile, mkdir, readdir, writeFile } from "fs/promises"
import consola from "consola"
import { getEnumValues } from "deepsea-tools"
import inquirer from "inquirer"

import { PackageManager } from "@src/constant"

import { addDependency } from "./addDependency"
import { addRuleToGitIgnore } from "./addRuleToGitIgnore"
import { backupFirst } from "./backupFirst"
import { getPackageManager } from "./getPackageManager"
import { hasDependency } from "./hasDependency"
import { insertWhen } from "./insertWhen"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"

export const ApplicationType = {
    Frontend: "Frontend",
    Backend: "Backend",
    FullStack: "FullStack",
} as const

export type ApplicationType = (typeof ApplicationType)[keyof typeof ApplicationType]

export async function addBuildDocker() {
    await backupFirst()

    interface Answer {
        type: ApplicationType
        manager: PackageManager
        name: string
        versions: string[]
        versionSource: string
        local: boolean
        docker: string
        format: string
        build: string
        dist: string
        useGitignore: string
        rules: string[]
        runtime: string
        port: string
    }

    const json = await readPackageJson()

    const isFullStack = await hasDependency(/^(next|@remix-run\/|@react-router\/|@tanstack\/react-start$)/)

    const isBackend = await hasDependency(/^(express$|hono$|@nestjs\/|koa$)/)

    const defaultType = isFullStack ? ApplicationType.FullStack : isBackend ? ApplicationType.Backend : ApplicationType.Frontend

    const defaultManager = await getPackageManager()

    const defaultBuild = json.scripts?.build ? "build" : (Object.keys(json.scripts ?? {}).find(item => /\bbuild\b/i.test(item)) ?? "build")

    const { type, name, local, versions } = await inquirer.prompt<Answer>([
        {
            type: "list",
            name: "type",
            message: "Please select the application type",
            choices: Object.entries(ApplicationType).map(([name, value]) => ({ name, value })),
            default: defaultType,
        },
        {
            type: "input",
            name: "name",
            message: "Please enter the application name",
            default: json.name?.trim(),
        },
        {
            type: "confirm",
            name: "local",
            message: "Do you want to save the docker image locally?",
            default: false,
        },
        {
            type: "checkbox",
            name: "versions",
            message: "Please select the image versions",
            choices: ["latest", "custom"],
            default: ["latest", "custom"],
        },
    ])

    if (versions.length === 0) {
        consola.error("Please select at least one image version")
        process.exit(1)
    }

    const { port } = await inquirer.prompt<Answer>({
        type: "input",
        name: "port",
        message: "Please enter the application port",
        default: type === ApplicationType.Frontend ? "80" : "3000",
    })

    let versionSource: string | undefined

    if (versions.includes("custom")) {
        const { versionSource: versionSource2 } = await inquirer.prompt<Answer>({
            type: "list",
            name: "versionSource",
            message: "Please select the custom image version source",
            choices: ["Day.js version", "package.json version", "input"],
            default: "Day.js version",
        })

        versionSource = versionSource2
    }

    let docker: string | undefined

    if (local) {
        const { docker: docker2 } = await inquirer.prompt<Answer>({
            type: "input",
            name: "docker",
            message: "Please enter the directory to save images",
            default: "docker",
        })

        docker = docker2
    }

    let format: string | undefined

    if (versionSource === "Day.js version") {
        const { format: format2 } = await inquirer.prompt<Answer>({
            type: "input",
            name: "format",
            message: "Please enter the format",
            default: "YYMMDDHHmm",
        })

        format = format2
    }

    const dir = await readdir(".")

    if (type === ApplicationType.Frontend) {
        const { manager } = await inquirer.prompt<Answer>({
            type: "list",
            name: "manager",
            message: "Please select the package manager",
            choices: getEnumValues(PackageManager),
            default: defaultManager,
        })

        const { build } = await inquirer.prompt<Answer>({
            type: "input",
            name: "build",
            message: "Please enter the build command",
            default: `${manager} run ${defaultBuild}`,
        })

        const defaultDist = dir.includes("build") ? "build" : "dist"

        const { dist } = await inquirer.prompt<Answer>({
            type: "input",
            name: "dist",
            message: "Please enter the dist directory",
            default: defaultDist,
        })

        const buildLatest = versions.includes("latest")
        const buildCustom = versions.includes("custom")

        const script = `// @ts-check
${insertWhen(versions.includes("custom"), `import consola from "consola"`, { breakBefore: true })}${insertWhen(
            versionSource === "Day.js version",
            `import dayjs from "dayjs"`,
            { breakBefore: true },
        )}${insertWhen(versionSource === "package.json version", `import { readFile } from "fs/promises"`, {
            breakBefore: true,
        })}${insertWhen(local, `import { join } from "path"`, { breakBefore: true })}
import { spawnAsync } from "soda-nodejs"
${insertWhen(
    versionSource === "package.json version",
    `
const str = await readFile("package.json", "utf-8")
const json = JSON.parse(str)
`,
)}
const name = "${name}"

${insertWhen(
    buildCustom,
    `let customTag = ${insertWhen(versionSource === "package.json version", "json.version")}${insertWhen(versionSource === "Day.js version", `dayjs().format("${format}")`)}${insertWhen(
        versionSource === "input",
        `await consola.prompt("Please enter the image tag", { type: "text" })`,
    )}`,
)}

console.log()

/** @type {import("child_process").SpawnOptions} */
const options = {
    shell: true,
    stdio: "inherit",
}

await spawnAsync("${build}", options)

console.log()

await spawnAsync(\`docker build${insertWhen(buildCustom, ` -t \${name}:\${customTag}`)}${insertWhen(buildLatest, ` -t \${name}:latest`)} .\`, options)
${insertWhen(
    local,
    `${insertWhen(
        buildCustom,
        `
console.log()

await spawnAsync(\`docker save \${name}:\${customTag} > \${join("${docker ?? "docker"}", \`\${name}-\${customTag}.tar\`)}\`, options)`,
    )}
${insertWhen(
    buildLatest,
    `
console.log()
await spawnAsync(\`docker save \${name}:latest > \${join("${docker ?? "docker"}", \`\${name}-latest.tar\`)}\`, options)`,
)}`,
)}`

        const dockerFile = `# 使用官方 nginx 镜像作为基础镜像
FROM nginx:alpine

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 删除默认的 nginx 静态资源
RUN rm -rf ./*

# 将 dist 文件夹中的内容复制到 nginx 的 html 目录下
COPY ${dist} .

# 可选：复制自定义的 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE ${port}

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
`
        const nginxFile = `worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    # default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;

    server {
        listen ${port};
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html index.htm;
        location / {
            try_files $uri $uri/ /index.html; # 对于 SPA 应用的路由支持
        }
    }
}
`
        if (local) await mkdir(docker!, { recursive: true })
        await mkdir("scripts", { recursive: true })
        await writeFile("scripts/build-docker.mjs", script)
        await writeFile("Dockerfile", dockerFile)
        await writeFile("nginx.conf", nginxFile)
        await writePackageJson({
            data: {
                ...json,
                scripts: {
                    ...json.scripts,
                    "build:docker": `cross-env NODE_ENV=production ${manager === "bun" ? "bun" : "node"} scripts/build-docker.mjs`,
                },
            },
        })
    } else {
        let created = false

        if (dir.includes(".gitignore")) {
            const { useGitignore } = await inquirer.prompt<Answer>({
                type: "confirm",
                name: "useGitignore",
                message: "Do you want to use the .gitignore as the dockerignore file?",
                default: true,
            })

            if (useGitignore) {
                await copyFile(".gitignore", ".dockerignore")
                created = true
            }
        }

        if (!created) {
            const { rules } = await inquirer.prompt<Answer>({
                type: "checkbox",
                name: "rules",
                message: "Please select the rules",
                choices: dir,
                default: dir.filter(item => !["node_modules", "dist", "build", docker?.split("/").at(0)].includes(item)),
            })

            await writeFile(".dockerignore", rules.join("\n"))
        }

        if (type === ApplicationType.Backend) {
            const dockerFile = `# 使用 bun 的 alpine 版本作为基础镜像
FROM oven/bun:alpine

# 设置工作目录
WORKDIR /app

# 复制源代码
COPY . .

# 安装依赖
RUN bun install --registry=https://registry.npmmirror.com

# 暴露端口（根据你的应用需要调整）
EXPOSE ${port}

# 运行应用
CMD ["bun", "run", "index.ts"]
`
            await writeFile("Dockerfile", dockerFile)
        } else {
            const dockerFile = `FROM oven/bun:alpine AS deps
WORKDIR /app
COPY . .
RUN bun install --registry=https://registry.npmmirror.com

FROM oven/bun:alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build

FROM oven/bun:alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE ${port}

CMD ["bun", "run", "start"]
`
            await writeFile("Dockerfile", dockerFile)
        }

        consola.warn("Please confirm the Dockerfile is correct")
    }

    if (docker) await addRuleToGitIgnore(docker)

    const packages = ["soda-nodejs", "cross-env"]

    if (versionSource === "Day.js version") packages.push("dayjs")

    if (versions.includes("custom")) packages.push("consola")

    await addDependency({
        package: packages,
        type: "devDependencies",
    })
}
