import { execAsync } from "soda-nodejs"

export type PidInfo = {
    pid: number
    info: string
}

export async function getProcessInfoFromPid(pid: number) {
    try {
        const stdout = await execAsync(`tasklist | findstr ${pid}`)
        const reg = new RegExp(`( +)${pid}( (Services|Console) +)`)
        return stdout
            .split(/[\n\r]/)
            .find(line => reg.test(line))
            ?.replace(reg, "$1$2")
            ?.replace(/ +/g, " ")
    } catch {
        return undefined
    }
}

export async function getPidInfoFromPort(port: number) {
    try {
        const stdout = await execAsync(`netstat -ano | findstr :${port}`)
        const reg = new RegExp(` (\\[::\\]|(\\d{1,3}\\.){3}\\d{1,3}):${port} `)

        const result = Array.from(
            new Set(
                stdout
                    .split(/[\n\r]/)
                    .filter(line => reg.test(line))
                    .map(line => ({
                        pid: parseInt(line.match(reg)![1]),
                        info: line,
                    })),
            ),
        )

        for (let i = 0; ; ) {
            if (result.some(({ info }) => info[i] === undefined)) break

            if (
                result.some(
                    ({ info }) => info[i] !== " " || info[i + 1] !== " ",
                )
            ) {
                i++
                continue
            }

            result.forEach(
                item =>
                    (item.info = `${item.info.slice(0, i)}${item.info.slice(i + 1)}`),
            )
        }

        return result
    } catch {
        return []
    }
}
