/** KORDOC_MAX_UNZIP_MB — ZIP 비압축 상한 조절 (#91) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { unzipLimitBytes } from "../src/utils.js"

describe("unzipLimitBytes", () => {
  const MB = 1024 * 1024
  const withEnv = (v: string | undefined, fn: () => void) => {
    const prev = process.env.KORDOC_MAX_UNZIP_MB
    if (v === undefined) delete process.env.KORDOC_MAX_UNZIP_MB
    else process.env.KORDOC_MAX_UNZIP_MB = v
    try { fn() } finally {
      if (prev === undefined) delete process.env.KORDOC_MAX_UNZIP_MB
      else process.env.KORDOC_MAX_UNZIP_MB = prev
    }
  }

  it("미설정·잘못된 값은 포맷 기본값", () => {
    for (const v of [undefined, "", "abc", "0", "-5"]) withEnv(v, () => assert.equal(unzipLimitBytes(100 * MB), 100 * MB))
  })

  it("양수면 그 값(MB), 상한 8192MB", () => {
    withEnv("512", () => assert.equal(unzipLimitBytes(100 * MB), 512 * MB))
    withEnv("99999", () => assert.equal(unzipLimitBytes(100 * MB), 8192 * MB))
  })
})
