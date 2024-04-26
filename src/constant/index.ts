export enum PackageManager {
    npm = "npm",
    yarn = "yarn",
    pnpm = "pnpm",
    bun = "bun"
}

export enum Registry {
    npm = "https://registry.npmjs.org/",
    taobao = "https://registry.npmmirror.com/",
    tencent = "https://mirrors.cloud.tencent.com/npm/"
}

export enum Software {
    "VS Code" = "VS Code",
    "Chrome" = "Chrome",
    "Supermium" = "Supermium",
    "7zip" = "7zip",
    "Git" = "Git",
    "NodeJS" = "NodeJS",
    "Geek Uninstaller" = "Geek Uninstaller",
    "DeskGo" = "DeskGo"
}

export enum ProjectType {
    next = "next",
    remix = "remix",
    vite = "vite",
    rsbuild = "rsbuild"
}

export enum CommitType {
    feature = "feature",
    fix = "fix",
    docs = "docs",
    wip = "wip",
    perfs = "perfs",
    rollback = "rollback",
    other = "other"
}

export const CommitTypeMap = {
    [CommitType.feature]: "✨feature: ",
    [CommitType.fix]: "🐞 fix: ",
    [CommitType.docs]: "📄 docs: ",
    [CommitType.wip]: "🖥️ wip: ",
    [CommitType.perfs]: "🚅 perfs: ",
    [CommitType.rollback]: "⏪ rollback: ",
    [CommitType.other]: "🔵 other: "
}