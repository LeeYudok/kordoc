/** OCR 로 읽은 제목 후보 강등 — 인포그래픽 글 조각은 제목이 아니다 (src/pdf/heading-demote.ts) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { demoteNonHeadingRoles } from "../src/pdf/heading-demote.js"
import type { IRBlock } from "../src/types.js"

const h = (text: string, y: number, fontName = "ocr"): IRBlock => ({ type: "heading", level: 3, text, pageNumber: 1,
  bbox: { page: 1, x: 60, y, width: 300, height: 20 }, style: { fontName, fontSize: 18 } })

describe("OCR heading candidates", () => {
  it("demotes OCR fragments: leading punctuation, ellipsis, a lone letter, sentence-long lines", () => {
    // ODL 141 "10 THINGS YOU SHOULD KNOW ABOUT COPYRIGHT" 인포그래픽
    const blocks = [h("COPYRIGHT", 700), h(". Uploading you … llection of music, movies,", 600), h("C", 500),
      h("Facts and ideas are not protected bycopyright, neither", 400)]
    demoteNonHeadingRoles(blocks, new Map([[1, 800]]))
    assert.deepEqual(blocks.map(b => b.type), ["heading", "paragraph", "paragraph", "paragraph"])
  })

  it("keeps the same shapes when they come from the text layer", () => {
    const blocks = [h("Facts and ideas are not protected by copyright, neither are", 400, "Body")]
    demoteNonHeadingRoles(blocks, new Map([[1, 800]]))
    assert.equal(blocks[0].type, "heading")
  })
})
