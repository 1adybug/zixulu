import { spawnAsync } from "soda-nodejs"

/**
 * 执行 Prisma 数据库推送和客户端生成命令
 * 运行 'npx prisma db push' 和 'npx prisma generate'
 */
export async function generatePrisma() {
    await spawnAsync("npx prisma db push && npx prisma generate", { shell: true, stdio: "inherit" })
}
