export type RetryConfig<T> = {
    action: () => Promise<T>
    count?: number
    callback?: (error: unknown, current: number) => void
}

export async function retry<T>(config: RetryConfig<T>): Promise<T>
export async function retry<T>(action: () => Promise<T>, count?: number): Promise<T>
export async function retry<T>(actionOrConfig: RetryConfig<T> | (() => Promise<T>), countNumber?: number) {
    let current = 1
    let {
        action,
        count = 2,

        callback,
    } = typeof actionOrConfig === "function" ? ({ action: actionOrConfig, count: countNumber } as RetryConfig<T>) : actionOrConfig
    async function _retry() {
        try {
            return await action()
        } catch (error) {
            callback?.(error, current)
            if (count === 1) throw error
            current++
            count--
            return await _retry()
        }
    }
    return await _retry()
}
