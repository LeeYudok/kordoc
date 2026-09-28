/** PDF 각주 → 참조 문단 "(주: …)" (src/pdf/footnotes.ts) — HWPX·HWP5 파서와 같은 자리·모양 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { superscriptNoteMarks, inlineFootnotes } from "../src/pdf/footnotes.js"
import type { NormItem } from "../src/pdf/text-line.js"
import type { IRBlock } from "../src/types.js"

const item = (text: string, x: number, y: number, w: number, fontSize = 12): NormItem => ({ text, x, y, w, h: fontSize, fontSize, fontName: "F", isHidden: false })
const para = (text: string, y: number, page = 44, height = 10): IRBlock => ({ type: "paragraph", text, pageNumber: page, bbox: { page, x: 57, y, width: 480, height }, style: { fontSize: 10 } })

describe("superscriptNoteMarks", () => {
  it("finds a small raised N) glued to the preceding word", () => {
    const items = [item("기구에서", 180, 659, 48), item("권고사항", 255, 659, 48), item("6)", 303, 661, 9, 9), item("6)", 57, 68, 12), item("여객선의", 76, 68, 48)]
    assert.deepEqual(superscriptNoteMarks(items).map(m => m.mark), ["6)"])
  })

  it("ignores list numbers and same-size marks", () => {
    assert.deepEqual(superscriptNoteMarks([item("1)", 57, 600, 12), item("가", 72, 600, 12), item("문장", 100, 500, 24), item("2)", 124, 500, 12)]).length, 0)
  })
})

describe("inlineFootnotes", () => {
  it("moves a page-bottom footnote to its reference paragraph", () => {
    const blocks = [para("표준은 기구에서 채택한 권고사항6)에 따라 승인을 받아야 한다.", 650), para("4.3 설계 가속도", 460),
      para("6) 여객선의 선내방송장치 성능기준에 관한 권고", 29), para("- 44 -", 5), para("7) 다음 쪽 각주가 아닌 줄", 60, 45)]
    const out = inlineFootnotes(blocks, new Map([[44, { marks: [{ mark: "6)", y: 661 }], seps: [45] }]]))
    assert.deepEqual(out.map(b => [b.text, b.footnoteText]), [
      ["표준은 기구에서 채택한 권고사항6)에 따라 승인을 받아야 한다.", "6) 여객선의 선내방송장치 성능기준에 관한 권고"],
      ["4.3 설계 가속도", undefined], ["- 44 -", undefined], ["7) 다음 쪽 각주가 아닌 줄", undefined]])
  })

  it("joins several notes of one paragraph with '; ' and takes continuation lines", () => {
    const blocks = [para("김선형2)은 입체적 인물3)이다", 650), para("2) 순결을 지킴", 60), para("이어진 각주 줄", 47), para("3) 평면적 인물", 34)]
    const out = inlineFootnotes(blocks, new Map([[44, { marks: [{ mark: "2)", y: 660 }, { mark: "3)", y: 660 }], seps: [80] }]]))
    assert.equal(out.length, 1)
    assert.equal(out[0].footnoteText, "2) 순결을 지킴 이어진 각주 줄; 3) 평면적 인물")
  })

  it("needs a footnote separator rule just above the notes (글로 친 가짜 각주는 본문)", () => {
    const blocks = [para("회사 이름 “Xerox®”8)은 동사", 650), para("8) Xerox®는 Xerox Corporation의 상표이다.", 91)]
    assert.equal(inlineFootnotes(blocks, new Map([[111, { marks: [{ mark: "8)", y: 655 }], seps: [] }]])).length, 2)
    const far = [para("회사 이름 “Xerox®”8)은 동사", 650, 111), para("8) Xerox®는 Xerox Corporation의 상표이다.", 91, 111)]
    assert.equal(inlineFootnotes(far, new Map([[111, { marks: [{ mark: "8)", y: 655 }], seps: [300] }]])).length, 2)
  })

  it("leaves a numbered list without superscript references alone", () => {
    const blocks = [para("본문", 650), para("1) 첫째", 60), para("2) 둘째", 40)]
    assert.equal(inlineFootnotes(blocks, new Map()).length, 3)
  })
})
