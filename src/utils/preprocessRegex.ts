/**
 * 预处理正则表达式字符串，将易于输入的占位符替换为特殊字符
 * 支持的占位符：
 * - <CARET> -> ^ (匹配字符串开头)
 */
export function preprocessRegex(reg: string): string {
    return reg.replace(/<CARET>/g, "^")
}

