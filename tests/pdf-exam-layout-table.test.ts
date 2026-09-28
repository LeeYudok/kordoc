/** 시험지 선택지·수식 배치는 표가 아니다 (src/pdf/table-roles.ts isExamLayoutTable) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isExamLayoutTable } from "../src/pdf/table-roles.js"
import type { IRTable } from "../src/types.js"

const t = (rows: string[][]): IRTable => ({ rows: rows.length, cols: rows[0].length, cells: rows.map(r => r.map(text => ({ text, colSpan: 1, rowSpan: 1 }))) })

describe("isExamLayoutTable", () => {
  it("treats choice rows and equation fragments as exam layout", () => {
    assert.equal(isExamLayoutTable(t([["문1）$\\frac{1}{4}$", "의 값은?"], ["①", "② $\\frac{1}{2}$"], ["④ $2$", "⑤ $4$"]])), true)
    assert.equal(isExamLayoutTable(t([["", "문4） 22_11_실전 4) ③", ""], ["이므로", "′", "$g(x)=x^{2}f(x)$를 미분하면"], ["", "′ 문5） 22_11_실전 5) ⑤", "$g(2)=16$′"]])), true)
  })

  it("keeps real tables, including math value tables without choice marks", () => {
    assert.equal(isExamLayoutTable(t([["구분", "2025", "2026"], ["수출", "1,200", "1,350"], ["수입", "900", "1,010"]])), false)
    assert.equal(isExamLayoutTable(t([["$x$", "$f(x)$"], ["$1$", "$2$"], ["$2$", "$5$"]])), false)
  })
})
