import { isSudo } from "@src/constant"

export async function test() {
    console.log(isSudo)
    console.log(process.argv)
}
