import { readBunConfig } from "./readBunConfig"
import { writeBunConfig } from "./writeBunConfig"

export async function setBun() {
    const config = await readBunConfig()
    config.install ??= {}
    config.install.cache ??= {}
    config.install.cache.disable = true
    await writeBunConfig(config)
}
