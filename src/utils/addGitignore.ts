import { addedRules } from "@constant/index"

import { addRuleToGitIgnore } from "./addRuleToGitIgnore"

export async function addGitignore() {
    return addRuleToGitIgnore(...addedRules)
}
