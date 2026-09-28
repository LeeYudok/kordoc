/** 보도자료 연락처 표 — 칸 클립 없는 PDF 에서 4열로 뭉친 "직위 이름 연락처" 칸을 HWPX 서식처럼 6열로 (src/pdf/contact-table.ts) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { splitContactTables } from "../src/pdf/contact-table.js"
import type { IRBlock, IRCell } from "../src/types.js"

const cell = (text: string, rowSpan = 1): IRCell => ({ text, colSpan: 1, rowSpan })
const block = (cells: IRCell[][]): IRBlock => ({ type: "table", table: { rows: cells.length, cols: cells[0].length, cells, hasHeader: false } })

describe("splitContactTables", () => {
  it("두 행 연락처 표: 앞 두 열 병합 칸은 줄마다 행으로, 끝 칸은 직위·이름·연락처 세 칸으로", () => {
    const b = block([
      [cell("담당 부서", 2), cell("예산실\n산업중소벤처예산과", 2), cell("책임자"), cell("과 장 정희철 (044-214-2730)")],
      [cell(""), cell(""), cell("담당자"), cell("사무관 이대권 (daekwon@korea.kr)")],
    ])
    splitContactTables([b])
    assert.equal(b.table!.cols, 6)
    assert.deepEqual(b.table!.cells.map(r => r.map(c => c.text)), [
      ["담당 부서", "예산실", "책임자", "과 장", "정희철", "(044-214-2730)"],
      ["", "산업중소벤처예산과", "담당자", "사무관", "이대권", "(daekwon@korea.kr)"],
    ])
    assert.ok(b.table!.cells.flat().every(c => c.rowSpan === 1 && c.colSpan === 1))
  })

  it("연락처 모양이 아닌 4열 표는 그대로", () => {
    const b = block([[cell("구분"), cell("내용"), cell("책임자"), cell("홍길동")], [cell("가"), cell("나"), cell("담당자"), cell("비고 없음")]])
    splitContactTables([b])
    assert.equal(b.table!.cols, 4)
  })
})
