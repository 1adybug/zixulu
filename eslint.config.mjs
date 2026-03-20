// @ts-check

import config from "@1adybug/eslint"
import { defineConfig } from "eslint/config"

export default defineConfig([
    ...config,
    {
        rules: {
            "n/hashbang": "off",
            "n/no-process-exit": "off",
        },
    },
])
