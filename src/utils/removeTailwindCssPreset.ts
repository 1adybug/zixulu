import { CommitType } from "@src/constant"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { getCommitMessage } from "./getCommitMessage"
import { readPackageJson } from "./readPackageJson"
import { writePackageJson } from "./writePackageJson"
import { getPackageVersionInDependcy } from "./getPackageVersionInDependcy"

const patch = `diff --git a/CHANGELOG.md b/CHANGELOG.md
deleted file mode 100644
index 6156ddff610079324151bcf185293609374c2001..0000000000000000000000000000000000000000
diff --git a/lib/css/preflight.css b/lib/css/preflight.css
index 7a0d82d46e040f2bf7b133e47380b1dc599e855c..514251188aee081e9045a3a26a6769c3717f5de6 100644
--- a/lib/css/preflight.css
+++ b/lib/css/preflight.css
@@ -376,8 +376,8 @@ Constrain images and videos to the parent width and preserve their intrinsic asp
 
 img,
 video {
-  max-width: 100%;
-  height: auto;
+  /* max-width: 100%;
+  height: auto; */
 }
 
 /* Make elements with the HTML hidden attribute stay hidden by default */
`

export async function removeTailwindCssPreflight(version?: string) {
    version ??= await getPackageVersionInDependcy("tailwindcss")
    await mkdir("patches", { recursive: true })
    await writeFile(join("patches", `tailwindcss@${version}.patch`), patch, "utf-8")
    const packageJson2 = await readPackageJson()
    packageJson2.pnpm ??= {}
    packageJson2.pnpm.patchedDependencies ??= {}
    packageJson2.pnpm.patchedDependencies[`tailwindcss@${version}`] = `patches/tailwindcss@${version}.patch`
    packageJson2.scripts ??= {}
    if (packageJson2.scripts.preinstall && !packageJson2.scripts.preinstall.includes("only-allow pnpm"))
        packageJson2.scripts.preinstall = `npx only-allow pnpm && ${packageJson2.scripts.preinstall}`
    else packageJson2.scripts.preinstall = "npx only-allow pnpm"
    await writePackageJson({ data: packageJson2 })
    return getCommitMessage(CommitType.feature, "删除 tailwindcss 的 preflight.css 中的 img 和 video 样式")
}
