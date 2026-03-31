export interface RegexPlaceholder {
    /** 占位符文本 */
    token: string
    /** 实际替换后的正则字符 */
    value: string
}

export const regexPlaceholders: RegexPlaceholder[] = [
    {
        token: "__SPACE__",
        value: " ",
    },
    {
        token: "__CARET__",
        value: "^",
    },
    {
        token: "__DOLLAR__",
        value: "$",
    },
    {
        token: "__PIPE__",
        value: "|",
    },
    {
        token: "__AMPERSAND__",
        value: "&",
    },
    {
        token: "__SEMICOLON__",
        value: ";",
    },
    {
        token: "__LPAREN__",
        value: "(",
    },
    {
        token: "__RPAREN__",
        value: ")",
    },
    {
        token: "__LBRACE__",
        value: "{",
    },
    {
        token: "__RBRACE__",
        value: "}",
    },
    {
        token: "__LBRACKET__",
        value: "[",
    },
    {
        token: "__RBRACKET__",
        value: "]",
    },
    {
        token: "__SQUOTE__",
        value: "'",
    },
    {
        token: "__DQUOTE__",
        value: '"',
    },
    {
        token: "__BACKTICK__",
        value: "`",
    },
    {
        token: "__AT__",
        value: "@",
    },
    {
        token: "__LT__",
        value: "<",
    },
    {
        token: "__GT__",
        value: ">",
    },
    {
        token: "__BACKSLASH__",
        value: "\\",
    },
]

export const regexPlaceholderHint = "特殊字符请使用 __XXX__ 占位符，例如 __CARET__、__DOLLAR__、__PIPE__、__LPAREN__、__RPAREN__、__AMPERSAND__、__SPACE__"

/**
 * 预处理命令行中的占位符，将易于输入的占位符替换为特殊字符
 * 占位符只做原始字符替换，不会自动补充正则转义
 * 支持的占位符：
 * - __SPACE__ -> 空格
 * - __CARET__ -> ^ (匹配字符串开头)
 * - __DOLLAR__ -> $ (匹配字符串结尾)
 * - __PIPE__ -> |
 * - __AMPERSAND__ -> &
 * - __SEMICOLON__ -> ;
 * - __LPAREN__ / __RPAREN__ -> ( / )
 * - __LBRACE__ / __RBRACE__ -> { / }
 * - __LBRACKET__ / __RBRACKET__ -> [ / ]
 * - __SQUOTE__ / __DQUOTE__ -> ' / "
 * - __BACKTICK__ -> `
 * - __AT__ -> @
 * - __LT__ / __GT__ -> < / >
 * - __BACKSLASH__ -> \
 */
export function preprocessPlaceholderText(text: string): string {
    return regexPlaceholders.reduce((result, placeholder) => result.split(placeholder.token).join(placeholder.value), text)
}

/**
 * 预处理正则表达式字符串
 */
export function preprocessRegex(reg: string): string {
    return preprocessPlaceholderText(reg)
}
