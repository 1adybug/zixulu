/**
 * 询问是否继续
 * @param message 询问信息
 * @returns 是否继续
 */
export async function shouldContinue(message = "是否继续"): Promise<boolean> {
    const { default: inquirer } = await import("inquirer")
    const { continue: cont } = await inquirer.prompt({
        type: "confirm",
        name: "continue",
        message,
    })
    return cont
}
