import { Agent } from "http"

import { HttpsProxyAgent } from "https-proxy-agent"

export enum PackageManager {
    npm = "npm",
    yarn = "yarn",
    pnpm = "pnpm",
    bun = "bun",
}

export enum Registry {
    npm = "https://registry.npmjs.com/",
    taobao = "https://registry.npmmirror.com/",
    tencent = "https://mirrors.cloud.tencent.com/npm/",
}

export enum Software {
    "VS Code" = "VS Code",
    "Chrome" = "Chrome",
    "7zip" = "7zip",
    "PeaZip" = "PeaZip",
    "Git" = "Git",
    "NodeJS" = "NodeJS",
    "Geek Uninstaller" = "Geek Uninstaller",
    "DeskGo" = "DeskGo",
    "PowerToys" = "PowerToys",
    "Honeyview" = "Honeyview",
    "AnyDesk" = "AnyDesk",
    "Firefox" = "Firefox",
    "PotPlayer" = "PotPlayer",
    "Bun" = "Bun",
    "PowerShell" = "PowerShell",
}

export enum ProjectType {
    next = "next",
    remix = "remix",
    vite = "vite",
    rsbuild = "rsbuild",
}

export enum CommitType {
    feature = "feature",
    fix = "fix",
    docs = "docs",
    wip = "wip",
    perfs = "perfs",
    rollback = "rollback",
    other = "other",
}

export const CommitTypeMap = {
    [CommitType.feature]: "✨feature: ",
    [CommitType.fix]: "🐞 fix: ",
    [CommitType.docs]: "📄 docs: ",
    [CommitType.wip]: "🖥️ wip: ",
    [CommitType.perfs]: "🚅 perfs: ",
    [CommitType.rollback]: "⏪ rollback: ",
    [CommitType.other]: "🔵 other: ",
}

export const SpawnOptions = {
    shell: true,
    stdio: "inherit",
}

export const agent = new HttpsProxyAgent("http://localhost:7890") as Agent

export const addedRules = [
    "package-lock.json",
    "pnpm-lock.yaml",
    "node_modules",
    "bun.lockb",
    "bun.lock",
    "dist*",
    "build",
    "yarn.lock",
    "yarn-error.log",
    ".yarnrc.yml",
    ".yarn",
    "test*",
]

export const isSudo = !!process.env.SUDO_USER
