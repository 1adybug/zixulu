import { defineConfig } from "father"

export default defineConfig({
    cjs: {
        output: "dist"
    },
    targets: {
        node: 18,
        chrome: 90
    },
    sourcemap: true
})
