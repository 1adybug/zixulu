import fetch from "node-fetch"

import { agent } from "@src/constant"

/**
 * GitHub Release 信息接口
 */
export interface Release {
    url: string
    assets_url: string
    upload_url: string
    html_url: string
    id: number
    author: Author
    node_id: string
    tag_name: string
    target_commitish: string
    name: string
    draft: boolean
    prerelease: boolean
    created_at: string
    published_at: string
    assets: Asset[]
    tarball_url: string
    zipball_url: string
    body: string
    discussion_url: string
    reactions: Reactions
}

export interface Reactions {
    url: string
    total_count: number
    "+1": number
    "-1": number
    laugh: number
    hooray: number
    confused: number
    heart: number
    rocket: number
    eyes: number
}

export interface Asset {
    url: string
    id: number
    node_id: string
    name: string
    label?: string
    uploader: Author
    content_type: string
    state: string
    size: number
    download_count: number
    created_at: string
    updated_at: string
    browser_download_url: string
}

export interface Author {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    site_admin: boolean
}

/**
 * 获取 GitHub 仓库的最新发布版本信息
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @returns Release 信息
 * @description 通过 GitHub API 获取仓库的最新发布信息
 */
export async function getLatestRelease(owner: string, repo: string): Promise<Release> {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    const response = await fetch(url, { agent })
    const data = await response.json()
    return data as Release
}
