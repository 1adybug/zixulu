import { defineConfig } from "father"

export default defineConfig({
    cjs: {
        output: "dist",
    },
    targets: {
        node: 22,
        chrome: 109,
    },
    sourcemap: true,
})
