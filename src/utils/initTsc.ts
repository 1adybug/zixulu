import { writeFile } from "fs/promises"

const config = `{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "skipLibCheck": true
    }
}
`

export async function initTsc() {
    await writeFile("tsconfig.json", config, "utf-8")
}
