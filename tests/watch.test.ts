/** Watch 모드 유닛 테스트 — WatchOptions 타입 검증 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import type { WatchOptions } from "../src/types.js"
import { postWebhookToAddress } from "../src/watch.js"

describe("WatchOptions 타입", () => {
  it("필수 필드만으로 유효", () => {
    const opts: WatchOptions = { dir: "./incoming" }
    assert.equal(opts.dir, "./incoming")
    assert.equal(opts.outDir, undefined)
    assert.equal(opts.webhook, undefined)
  })

  it("모든 필드 지정 가능", () => {
    const opts: WatchOptions = {
      dir: "./incoming",
      outDir: "./output",
      webhook: "https://api.example.com/hook",
      format: "json",
      pages: "1-3",
      silent: true,
    }
    assert.equal(opts.format, "json")
    assert.equal(opts.pages, "1-3")
    assert.equal(opts.silent, true)
  })
})

describe("webhook DNS pinning", () => {
  it("검증된 IP에 연결하면서 원래 Host를 유지한다", async () => {
    let receivedHost = ""
    let receivedBody = ""
    const server = createServer((req, res) => {
      receivedHost = req.headers.host ?? ""
      req.setEncoding("utf-8")
      req.on("data", chunk => { receivedBody += chunk })
      req.on("end", () => { res.end("ok") })
    })
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
    const port = (server.address() as AddressInfo).port
    try {
      // .invalid cannot resolve normally: success proves the HTTP request used the supplied address.
      await postWebhookToAddress(new URL(`http://rebind.example.invalid:${port}/hook`), { address: "127.0.0.1", family: 4 }, '{"ok":true}')
      assert.equal(receivedHost, `rebind.example.invalid:${port}`)
      assert.equal(receivedBody, '{"ok":true}')
    } finally {
      server.close()
    }
  })
})
