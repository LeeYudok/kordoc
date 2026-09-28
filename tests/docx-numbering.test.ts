/** DOCX 번호 라벨 — lvlText·카운터·형식 (src/docx/numbering.ts) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { ListCounter, type LevelDef } from "../src/docx/numbering.js"

const levels = (...defs: Array<[string, string, number?]>) => new Map<number, LevelDef>(defs.map(([numFmt, lvlText, start], i) => [i, { numFmt, lvlText, start: start ?? 1 }]))

describe("ListCounter", () => {
  it("counts per level, restarts deeper levels, and fills lvlText", () => {
    const c = new ListCounter(), lv = levels(["decimal", "%1."], ["decimal", "%1.%2"])
    assert.deepEqual([c.next("1", 0, lv), c.next("1", 1, lv), c.next("1", 1, lv), c.next("1", 0, lv), c.next("1", 1, lv)], ["1.", "1.1", "1.2", "2.", "2.1"])
  })

  it("keeps literal label text and other formats (참고문헌 [n]·로마·가나다)", () => {
    const c = new ListCounter()
    const ref = levels(["decimal", "[%1]"])
    assert.deepEqual([c.next("7", 0, ref), c.next("7", 0, ref), c.next("7", 0, ref)], ["[1]", "[2]", "[3]"])
    assert.equal(c.next("8", 0, levels(["upperRoman", "%1."])), "I.")
    assert.equal(c.next("9", 0, levels(["ganada", "%1)"])), "가)")
    assert.equal(c.next("10", 0, levels(["decimal", "보기"])), "보기")
  })

  it("shares counters across numIds of one abstractNum; a startOverride num restarts on first use", () => {
    // kats: 첫 제목만 번호 28(=abstractNum 28, startOverride 1), 나머지 제목은 스타일 번호 20(같은 abstractNum) → 1·2·3 으로 잇는다
    const c = new ListCounter()
    const shared = new Map<number, LevelDef>([[0, { numFmt: "decimal", lvlText: "%1", start: 1, list: "a" }]])
    const restart = new Map<number, LevelDef>([[0, { numFmt: "decimal", lvlText: "%1", start: 1, list: "a", restart: true }]])
    assert.deepEqual([c.next("20", 0, shared), c.next("28", 0, restart), c.next("20", 0, shared), c.next("20", 0, shared), c.next("28", 0, restart)], ["1", "1", "2", "3", "4"])
  })

  it("shows an unused upper level at its start (w:start 없음 = 0 → \"0.1 소개\")", () => {
    const c = new ListCounter()
    assert.equal(c.next("63", 1, levels(["decimal", "%1", 0], ["decimal", "%1.%2"])), "0.1")
  })

  it("returns null for bullets and empty for unnumbered levels", () => {
    const c = new ListCounter()
    assert.equal(c.next("1", 0, levels(["bullet", "•"])), null)
    assert.equal(c.next("2", 0, levels(["none", ""])), "")
  })
})

import JSZip from "jszip"
import { parse } from "../src/index.js"

async function docx(body: string, numbering: string, styles = ""): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`)
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`)
  zip.file("word/numbering.xml", numbering)
  if (styles) zip.file("word/styles.xml", styles)
  return await zip.generateAsync({ type: "arraybuffer" })
}
const W = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`
const para = (text: string, numId: string, ilvl = 0, style = "") => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${numId ? `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>` : ""}</w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`

describe("DOCX numbered paragraphs", () => {
  it("writes real labels: bibliography [n], decimal N., and style-numbered headings", async () => {
    const numbering = `<w:numbering ${W}>
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="[%1]"/></w:lvl></w:abstractNum>
      <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
      <w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1"/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1.%2"/></w:lvl></w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="3"><w:abstractNumId w:val="2"/></w:num>
    </w:numbering>`
    const styles = `<w:styles ${W}><w:style w:type="paragraph" w:styleId="H2"><w:name w:val="heading 2"/><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="3"/></w:numPr></w:pPr></w:style></w:styles>`
    const buf = await docx(para("개념", "3", 0) + para("개요", "", 0, "H2") + para("일반", "", 0, "H2") +
      para("ISO 9", "1") + para("KS M ISO 216", "1") + para("ISO 233", "1") + para("가", "2") + para("나", "2"), numbering, styles)
    const r = await parse(buf)
    assert.ok(r.success)
    const md = r.success ? r.markdown : ""
    for (const want of ["1 개념", "## 1.1 개요", "## 1.2 일반", "[1] ISO 9", "[2] KS M ISO 216", "[3] ISO 233", "1. 가", "2. 나"]) assert.ok(md.includes(want), `${want}\n${md}`)
  })
})

describe("DOCX numbering semantics", () => {
  it("continues a heading list across numIds sharing an abstractNum and reads a missing w:start as 0", async () => {
    const numbering = `<w:numbering ${W}>
      <w:abstractNum w:abstractNumId="28"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1 "/></w:lvl></w:abstractNum>
      <w:abstractNum w:abstractNumId="32"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1"/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1.%2"/></w:lvl></w:abstractNum>
      <w:num w:numId="20"><w:abstractNumId w:val="28"/></w:num>
      <w:num w:numId="28"><w:abstractNumId w:val="28"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>
      <w:num w:numId="63"><w:abstractNumId w:val="32"/></w:num>
    </w:numbering>`
    const styles = `<w:styles ${W}><w:style w:type="paragraph" w:styleId="H1"><w:name w:val="heading 1"/><w:pPr><w:numPr><w:numId w:val="20"/></w:numPr></w:pPr></w:style></w:styles>`
    const buf = await docx(para("소개", "63", 1) + para("적용범위", "28", 0, "H1") + para("인용표준", "", 0, "H1") + para("용어와 정의", "", 0, "H1"), numbering, styles)
    const r = await parse(buf)
    const md = r.success ? r.markdown : ""
    for (const want of ["0.1 소개", "# 1 적용범위", "# 2 인용표준", "# 3 용어와 정의"]) assert.ok(md.includes(want), `${want}\n${md}`)
  })

  it("takes a style's level from the abstractNum level bound to it (w:lvl/w:pStyle) when the style names no w:ilvl", async () => {
    // kats 부속서: 스타일 "부속서 A"·"A.1" 모두 번호 7 만 걸고 수준은 abstractNum 의 w:pStyle 로 묶는다
    const numbering = `<w:numbering ${W}>
      <w:abstractNum w:abstractNumId="52"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:pStyle w:val="AnxA"/><w:lvlText w:val="부속서 %1"/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="AnxA1"/><w:lvlText w:val="%1.%2"/></w:lvl></w:abstractNum>
      <w:num w:numId="7"><w:abstractNumId w:val="52"/></w:num>
    </w:numbering>`
    const style = (id: string, name: string) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:pPr><w:numPr><w:numId w:val="7"/></w:numPr></w:pPr></w:style>`
    const styles = `<w:styles ${W}>${style("AnxA", "heading 1")}${style("AnxA1", "heading 2")}</w:styles>`
    const buf = await docx(para("(참고)", "", 0, "AnxA") + para("일반사항", "", 0, "AnxA1") + para("실물 정의", "", 0, "AnxA1") + para("(참고)", "", 0, "AnxA") + para("일반사항", "", 0, "AnxA1"), numbering, styles)
    const r = await parse(buf)
    const md = r.success ? r.markdown : ""
    for (const want of ["# 부속서 A (참고)", "## A.1 일반사항", "## A.2 실물 정의", "# 부속서 B (참고)", "## B.1 일반사항"]) assert.ok(md.includes(want), `${want}\n${md}`)
  })
})
