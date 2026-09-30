import { strict as assert } from "node:assert"
import { describe, it } from "node:test"
import type { IRBlock } from "../src/types.js"
import { detectTypographyHeadings } from "../src/pdf/block-detect.js"
import { FACE_CHARS } from "../src/pdf/paragraph-lines.js"

const paragraph = (text: string, fontName: string, y: number, height = 11): IRBlock => ({
  type: "paragraph", text, style: { fontName, fontSize: 11 },
  pageNumber: 1, bbox: { page: 1, x: 62, y, width: 320, height },
})

describe("PDF typography headings", () => {
  it("recognizes an isolated heading in a different face at body font size", () => {
    const blocks = [
      paragraph("A long paragraph of body text that continues across several lines in the document. ".repeat(3), "regular", 360, 100),
      paragraph("7 Variants of Observer Models", "semibold", 320),
      paragraph("The chapter begins with more body text in the regular face and continues for a while. ".repeat(2), "regular", 280, 35),
    ]
    detectTypographyHeadings(blocks)
    assert.equal(blocks[1].type, "heading")
    assert.equal(blocks[1].text, "7 Variants of Observer Models")
  })

  it("keeps a distinct face inside a dense paragraph as text", () => {
    const blocks = [
      paragraph("The following definition introduces a specific term in the discussion. ".repeat(3), "regular", 365, 22),
      paragraph("Definition 1. An observer is a source of responses.", "semibold", 353),
      paragraph("The explanation continues on the next line in the ordinary face. ".repeat(2), "regular", 341),
    ]
    detectTypographyHeadings(blocks)
    assert.equal(blocks[1].type, "paragraph")
  })

  it("recognizes a numbered section with tight academic spacing", () => {
    const blocks = [
      paragraph("The preceding discussion fills this part of the page with ordinary prose. ".repeat(3), "regular", 270, 35),
      paragraph("5 Conclusion", "semibold", 250),
      paragraph("The final discussion begins after the section title. ".repeat(2), "regular", 220, 20),
    ]
    detectTypographyHeadings(blocks)
    assert.equal(blocks[1].type, "heading")
  })

  it("does not turn a photo label into a heading without substantial prose", () => {
    const blocks = [
      paragraph("Chuj Country", "display", 600),
      paragraph("On the trail in the forest. May, at the end of the dry season. Photo by the author.", "caption", 95),
    ]
    detectTypographyHeadings(blocks)
    assert.equal(blocks[0].type, "paragraph")
  })

  it("keeps DOI, bullet, and chart axis labels as content", () => {
    const blocks = [
      paragraph("Ordinary prose from the document. ".repeat(12), "regular", 500, 110),
      paragraph("DOI: http://dx.doi.org/10.5772/example", "display", 350),
      paragraph("• LH: The entropy is low at both ends.", "display", 300),
      paragraph("OVER 50", "display", 250),
      paragraph("41-50", "display", 200),
    ]
    detectTypographyHeadings(blocks)
    assert.deepEqual(blocks.slice(1).map(b => b.type), Array(4).fill("paragraph"))
  })

  it("counts body face by characters, not by the face a long paragraph starts with (ODL 187)", () => {
    // 굵은 머리말("Alignment tuning.")로 시작한 긴 문단은 블록 대표 서체가 굵은 서체다 — 글자 수로는 본문 서체
    const runIn = paragraph("Alignment tuning. In the alignment tuning stage, the model is further fine-tuned. ".repeat(4), "bold", 200, 60)
    FACE_CHARS.set(runIn, new Map([["bold", 18], ["regular", runIn.text!.length - 18]]))
    const blocks = [
      paragraph("The preceding section ends with ordinary prose in the regular face. ".repeat(2), "regular", 330, 22),
      paragraph("3 Training Details", "bold", 300),
      paragraph("After continued pretraining, we perform fine-tuning in two stages.", "regular", 280),
      runIn,
    ]
    detectTypographyHeadings(blocks)
    assert.equal(blocks[1].type, "heading")
  })

})
