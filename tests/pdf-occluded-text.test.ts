/** 뒤에 칠한 불투명 사각형에 가려진 글 · 장 번호 제목 (ODL 079·080·021) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs"
import { occludedTextItems } from "../src/pdf/occluded-text.js"
import { detectHeadings } from "../src/pdf/block-detect.js"
import type { PdfTextItem } from "../src/pdf/text-line.js"
import type { IRBlock } from "../src/types.js"

const glyphs = (s: string) => [...s].map(unicode => ({ unicode }))
const item = (str: string, x: number, y: number, w: number): PdfTextItem => ({ str, transform: [10, 0, 0, 10, x, y], width: w, height: 10 })

describe("occludedTextItems", () => {
  const header = item("Header 6", 100, 798, 60)
  const body = item("Body", 100, 700, 30)

  it("hides text drawn before an opaque full-page fill, keeps text drawn after it", () => {
    const fn = [OPS.showText, OPS.save, OPS.constructPath, OPS.fill, OPS.restore, OPS.showText]
    const args = [[glyphs("Header 6")], [], [[OPS.rectangle], [0, 0, 595, 842]], [], [], [glyphs("Body")]]
    const hidden = occludedTextItems([header, body], fn, args)
    assert.deepEqual([...hidden], [header])
  })

  it("keeps text under a translucent or blended fill", () => {
    const fn = [OPS.showText, OPS.setGState, OPS.constructPath, OPS.fill, OPS.showText]
    for (const gs of [[["ca", 0.5]], [["BM", "Multiply"]]]) {
      const args = [[glyphs("Header 6")], [gs], [[OPS.rectangle], [0, 0, 595, 842]], [], [glyphs("Body")]]
      assert.equal(occludedTextItems([header, body], fn, args).size, 0)
    }
  })

  it("leaves items alone when their text does not line up with the drawn glyphs", () => {
    const fn = [OPS.showText, OPS.constructPath, OPS.fill, OPS.showText]
    const args = [[glyphs("Other")], [[OPS.rectangle], [0, 0, 595, 842]], [], [glyphs("Body")]]
    assert.equal(occludedTextItems([header, body], fn, args).size, 0)
  })
})

describe("chapter number heading", () => {
  it("promotes a large lone number standing right above a display title", () => {
    const blocks: IRBlock[] = [
      { type: "paragraph", text: "2", pageNumber: 1, bbox: { page: 1, x: 204, y: 503, width: 15, height: 30 }, style: { fontSize: 30, fontName: "a" } },
      { type: "paragraph", text: "The Lost Homeland", pageNumber: 1, bbox: { page: 1, x: 114, y: 462, width: 195, height: 24 }, style: { fontSize: 24, fontName: "a" } },
      { type: "paragraph", text: "5", pageNumber: 1, bbox: { page: 1, x: 390, y: 40, width: 4, height: 8 }, style: { fontSize: 30, fontName: "a" } },
    ]
    detectHeadings(blocks, 11)
    assert.deepEqual(blocks.map(b => b.type), ["heading", "heading", "paragraph"])
  })
})
