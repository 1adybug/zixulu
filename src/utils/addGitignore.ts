import { addedRules } from "@/constant/index"

import { addGitAttributes } from "./addGitAttributes"
import { addRuleToGitIgnore } from "./addRuleToGitIgnore"

/**
 * 添加预设的 gitignore 规则
 */
export async function addGitignore() {
    await addGitAttributes()
    const message = await addRuleToGitIgnore(...addedRules)
    return message
}
