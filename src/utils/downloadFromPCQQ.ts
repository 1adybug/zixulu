import { download } from "./download"

export namespace PCQQ {
    export interface Result {
        resp: Resp
    }

    export interface Resp {
        soft_list: Softlist[]
        retCode: number
    }

    export interface Softlist {
        soft_id: number
        os_type: number
        os_bit: number
        display_name: string
        nick_ver: string
        ver_name: string
        file_size: string
        file_name: string
        publish_date: string
        download_url: string
        download_https_url: string
    }
}

export async function downloadFromPCQQ(dir: string, cmdid: number, soft_id_list: number) {
    const data = new URLSearchParams()
    data.set("cmdid", cmdid.toString())
    data.set("jprxReq[req][soft_id_list][]", soft_id_list.toString())
    const headers = new Headers()
    headers.set("Content-Type", "application/x-www-form-urlencoded")
    const response = await fetch(`https://luban.m.qq.com/api/public/software-manager/softwareProxy`, {
        method: "POST",
        headers,
        body: data.toString(),
    })
    const result: PCQQ.Result = await response.json()
    await download(result.resp.soft_list[0].download_https_url, dir, result.resp.soft_list[0].file_name)
}
