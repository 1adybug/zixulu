// @ts-check

/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: ["@prettier/plugin-oxc", "prettier-plugin-organize-imports"],
}

export default config
