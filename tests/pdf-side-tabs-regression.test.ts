import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { sideTabGlyphs, type ClusterItem } from "../src/pdf/cluster-detector.js"
import { isSideTabTable, removeSideTabs } from "../src/pdf/side-tabs.js"
import type { IRBlock, IRTable } from "../src/types.js"

const item = (text: string, x: number, y: number, w = 6, fontSize = 6): ClusterItem =>
  ({ text, x, y, w, h: fontSize, fontSize, fontName: "Test" })
const column = (text: string, x: number) => [...text].map((ch, k) => item(ch, x, 400 - k * 7))
const body = Array.from({ length: 6 }, (_, k) => item("옆의 본문 문장이 계속 이어집니다", 70, 404 - k * 12, 330, 10))

describe("side tab band safeguards", () => {
  const numericTable = Array.from({ length: 6 }, (_, k) =>
    [item(String(k + 1), 433, 400 - k * 12), item(String(k + 2), 441, 400 - k * 12)]).flat()

  it("preserves a genuine two-column single-digit table without independent body text", () => {
    assert.equal(sideTabGlyphs(numericTable).size, 0)
  })

  it("a table heading outside the vertical band is not body evidence", () => {
    assert.equal(sideTabGlyphs([...numericTable, item("표 제목", 70, 450, 60, 10)]).size, 0)
  })

  it("blank glyphs next to a table are not body evidence", () => {
    assert.equal(sideTabGlyphs([...numericTable, item(" ", 70, 400, 60, 10)]).size, 0)
  })

  it("preserves a standalone vertical column", () => {
    assert.equal(sideTabGlyphs(column("구급차의의료장비", 433)).size, 0)
  })

  for (const [shortX, longX] of [[441, 433], [433, 441]]) {
    it("attaches a shorter sibling only to a qualified long tab column at " + shortX, () => {
      const glyphs = [...column("의료장비", shortX), ...column("구급차의의료장비", longX)]
      assert.deepEqual(sideTabGlyphs([...glyphs, ...body]), new Set(glyphs))
    })
  }

  it("two short columns do not jointly supply the long-column anchor", () => {
    assert.equal(sideTabGlyphs([...column("의료장비", 441), ...column("통신장비", 433), ...body]).size, 0)
  })

  it("a short sibling far from the long column remains ordinary text", () => {
    const glyphs = [...column("의료장비", 460), ...column("구급차의의료장비", 433)]
    assert.equal(sideTabGlyphs([...glyphs, ...body]).size, 0)
  })

  it("aligned table cells remain cells despite a long anchor and short sibling", () => {
    const glyphs = [...column("의료장비", 441), ...column("구급차의의료장비", 433)]
    const cells = Array.from({ length: 9 }, (_, k) => item("행 내용", 70, 400 - k * 7, 330, 10))
    assert.equal(sideTabGlyphs([...glyphs, ...cells]).size, 0)
  })
})

describe("side tab repetition is specific to the side", () => {
  it("keeps a one-off right annotation with the same text as a repeated left tab", () => {
    const b = (text: string, page: number, x: number, width = 9): IRBlock =>
      ({ type: "paragraph", text, pageNumber: page, bbox: { page, x, y: 400, width, height: 12 } })
    const left = [1, 2, 3].map(p => b("응", p, 37))
    const right = b("응", 1, 550)
    const prose = [1, 2, 3].map(p => b("본문 단락입니다. 내용이 이어집니다", p, 100, 300))
    const out = removeSideTabs([...left, right, ...prose], new Map([1, 2, 3].map(p => [p, 595])))
    assert.deepEqual(out, [right, ...prose])
  })
})

describe("ruled side tabs require independent body evidence", () => {
  const box = { x1: 558, y1: 237, x2: 612, y2: 782 }
  const table: IRTable = { rows: 3, cols: 1, hasHeader: false,
    cells: ["구분", "1", "2"].map(text => [{ text, rowSpan: 1, colSpan: 1 }]) }

  it("a narrow tall table alone is not a decoration", () => {
    assert.equal(isSideTabTable(box, table, [], 612, 842), false)
  })

  it("an unrelated heading above the table is not body evidence", () => {
    assert.equal(isSideTabTable(box, table, [{ x: 71, y: 800, w: 300 }], 612, 842), false)
  })
})
