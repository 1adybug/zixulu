import { addedRules } from "@constant/index"

import { addRuleToGitIgnore } from "./addRuleToGitIgnore"

/**
 * 添加预设的 gitignore 规则
 */
export async function addGitignore() {
    return addRuleToGitIgnore(...addedRules)
}
