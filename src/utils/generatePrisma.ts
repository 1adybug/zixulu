import { spawnAsync } from "."

export async function generatePrisma() {
    await spawnAsync("npx prisma db push && npx prisma generate")
}