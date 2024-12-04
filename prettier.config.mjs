// @ts-check

import { parse } from "path"
import { globSync } from "glob"

const jsExts = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs", ".cts", ".mts", ".vue"]

const assetExts = Array.from(
    new Set(
        globSync("**/*", { ignore: ["node_modules/**"], withFileTypes: true })
            .filter(path => path.isFile() && !jsExts.some(ext => path.name.toLowerCase().endsWith(ext)))
            .map(path => parse(path.name).ext.slice(1))
            .filter(ext => ext !== ""),
    ),
)

const assetExtsRegStr = `\\.(${assetExts.join("|")}|${assetExts.join("|").toUpperCase()})`

const assetQueryRegStr = "(\\?[a-zA-Z0-9]+)?"

/**
 * @type {import("prettier").Options}
 */
const config = {
    semi: false,
    tabWidth: 4,
    arrowParens: "avoid",
    printWidth: 160,
    plugins: ["@ianvs/prettier-plugin-sort-imports"],
    importOrder: [
        "<BUILTIN_MODULES>",
        "<THIRD_PARTY_MODULES>",
        "",
        `^@.+?(?<!${assetExtsRegStr}${assetQueryRegStr})$`,
        `^\\.{1,2}/.+?(?<!${assetExtsRegStr}${assetQueryRegStr})$`,
        "",
        `^@.+?${assetExtsRegStr}${assetQueryRegStr}$`,
        `^\\.{1,2}/.+?${assetExtsRegStr}${assetQueryRegStr}$`,
    ],
    importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
    importOrderTypeScriptVersion: "5.0.0",
    importOrderCaseSensitive: true,
}

export default config
