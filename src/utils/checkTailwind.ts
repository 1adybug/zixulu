import { getDependcy } from "./getDependcy"

export async function checkTailwind() {
    return !!(await getDependcy("tailwindcss"))
}
