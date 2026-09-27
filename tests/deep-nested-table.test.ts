import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parse, markdownToHwpx } from "../src/index.js"
import { blocksToMarkdown } from "../src/table/builder.js"
import type { IRBlock } from "../src/types.js"

/** 표 안의 표를 n 단으로 — 각 단은 2×2, 오른쪽 위 칸에 다음 단 */
const nestHtml = (n: number): string => n === 0 ? "" :
  `<table><tr><td>L${n} 항목</td><td>L${n} 내용${n > 1 ? "<br>" + nestHtml(n - 1) : ""}</td></tr>` +
  `<tr><td>L${n} 비고</td><td>L${n} 값</td></tr></table>`

function irDepth(blocks: IRBlock[] | undefined, d = 0): number {
  let m = d
  for (const b of blocks ?? []) {
    if (b.type !== "table" || !b.table) continue
    m = Math.max(m, d + 1)
    for (const row of b.table.cells) for (const c of row) m = Math.max(m, irDepth(c.blocks, d + 1))
  }
  return m
}

function htmlDepth(md: string): number {
  let d = 0, m = 0
  for (const t of md.matchAll(/<(\/?)table\b/g)) {
    if (t[1]) d--
    else m = Math.max(m, ++d)
  }
  return m
}

describe("깊은 중첩표 (3~8단)", () => {
  for (const n of [3, 6, 8]) {
    it(`HWPX ${n}단 중첩표가 IR·마크다운에서 단 수와 글을 유지`, async () => {
      const hwpx = await markdownToHwpx(`# 제목\n\n${nestHtml(n)}\n`)
      const res = await parse(hwpx)
      assert.ok(res.success)
      assert.equal(irDepth(res.blocks), n)
      assert.equal(htmlDepth(res.markdown), n)
      for (let k = 1; k <= n; k++) {
        for (const label of ["항목", "내용", "비고", "값"]) assert.ok(res.markdown.includes(`L${k} ${label}`), `L${k} ${label}`)
      }
    })
  }
})

describe("표 마크다운 — 칸 구조 보존", () => {
  it("GFM 칸의 강조 span 안 줄바꿈은 <br> — 행이 칸 중간에서 끊기지 않는다", () => {
    const md = blocksToMarkdown([{
      type: "table",
      table: {
        rows: 2, cols: 2, hasHeader: true,
        cells: [
          [{ text: "과제", colSpan: 1, rowSpan: 1 }, { text: "내용", colSpan: 1, rowSpan: 1 }],
          [
            { text: "필요성", colSpan: 1, rowSpan: 1 },
            {
              text: "첫 줄\n둘째 줄", colSpan: 1, rowSpan: 1,
              blocks: [{ type: "paragraph", text: "첫 줄\n둘째 줄", spans: [{ text: "첫 줄\n", bold: true }, { text: "둘째 줄" }] }],
            },
          ],
        ],
      },
    }])
    const rows = md.split("\n").filter(l => l.startsWith("|"))
    assert.equal(rows.length, 3, md)
    assert.match(rows[2], /첫 줄.*<br>.*둘째 줄/)
  })

  it("캡션 안 표(captionBlocks)는 평탄화 글이 아니라 표로 나간다", () => {
    const capTable = {
      rows: 2, cols: 2, hasHeader: true,
      cells: [
        [{ text: "구분", colSpan: 1, rowSpan: 1 }, { text: "신축", colSpan: 1, rowSpan: 1 }],
        [{ text: "1만㎡ 미만", colSpan: 1, rowSpan: 1 }, { text: "4,923", colSpan: 1, rowSpan: 1 }],
      ],
    }
    const md = blocksToMarkdown([{
      type: "table",
      table: {
        rows: 1, cols: 2, hasHeader: true,
        caption: "(단위 : 천원/㎡)\n구분 / 신축\n1만㎡ 미만 / 4,923",
        captionBlocks: [{ type: "paragraph", text: "(단위 : 천원/㎡)" }, { type: "table", table: capTable }],
        cells: [[{ text: "본표", colSpan: 1, rowSpan: 1 }, { text: "값", colSpan: 1, rowSpan: 1 }]],
      },
    }])
    assert.ok(md.includes("| 구분 | 신축 |"), md)
    assert.ok(!md.includes("구분 / 신축"), md)
  })
})
