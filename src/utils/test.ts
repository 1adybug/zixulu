import { isSudo } from "@/constant"

export async function test() {
    console.log(isSudo)
    console.log(process.argv)
}
