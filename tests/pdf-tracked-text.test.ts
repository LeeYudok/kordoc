/** 자간 벌린 글 — 글리프 흐름의 진짜 공백으로 낱말 경계 (ODL 103) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs"
import { restoreTrackedSpacing } from "../src/pdf/tracked-text.js"
import type { PdfTextItem } from "../src/pdf/text-line.js"

const raw = (str: string, fontName = "F1"): PdfTextItem => ({ str, transform: [11, 0, 0, 11, 100, 40], width: 100, height: 11, fontName })
const glyphs = (s: string) => [...s].map(unicode => ({ unicode }))

describe("restoreTrackedSpacing", () => {
  it("rebuilds letter-spaced words from the real space glyphs", () => {
    const items = [raw("E M A I L"), raw("F O R M O R E I N F O")]
    restoreTrackedSpacing(items, [OPS.setFont, OPS.showText], [["F1", 11], [glyphs("EMAIL FOR MORE INFO")]])
    assert.deepEqual(items.map(i => i.str), ["EMAIL", "FOR MORE INFO"])
  })

  it("leaves Hangul even spacing and unaligned fonts alone", () => {
    const items = [raw("홍 보 지 원 반"), raw("A B C D", "F2")]
    restoreTrackedSpacing(items, [OPS.setFont, OPS.showText, OPS.setFont, OPS.showText],
      [["F1", 11], [glyphs("홍보지원반")], ["F2", 11], [glyphs("XYZW")]])
    assert.deepEqual(items.map(i => i.str), ["홍 보 지 원 반", "A B C D"])
  })
})
