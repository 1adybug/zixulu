import { spawnAsync } from "soda-nodejs"

export async function generatePrisma() {
    await spawnAsync("npx prisma db push && npx prisma generate", { shell: true, stdio: "inherit" })
}
