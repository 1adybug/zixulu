import { spawnAsync } from "soda-nodejs"

export async function clearDockerLog(name: string) {
    await spawnAsync(`truncate -s 0 $(docker inspect --format='{{.LogPath}}' ${name})`, {
        shell: true,
        stdio: "inherit",
    })
}
