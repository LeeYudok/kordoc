/** 쪽 틀 판정 — 쪽 테두리 상자는 표가 아니다 (src/pdf/page-frame.ts) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isPageFrameGrid } from "../src/pdf/page-frame.js"
import type { TableGrid } from "../src/pdf/line-detector.js"

const W = 595, H = 841
const cell = (x1: number, y1: number, x2: number, y2: number) => ({ bbox: { x1, y1, x2, y2 } })
const grid = (colXs: number[]): TableGrid => ({ rowYs: [821, 786, 20], colXs, bbox: { x1: 20, y1: 20, x2: 575, y2: 821 }, vertexRadius: 2 })
const word = (x: number, y: number, w: number) => ({ x, y, w, h: 10 })

describe("isPageFrameGrid", () => {
  it("treats a page border whose body lines cross the header column lines as a frame (수능 모의고사)", () => {
    // 머리 띠 칸 경계 265·332 — 두 단 본문 줄이 그 x 를 가로지른다
    const items = [word(28, 700, 260), word(305, 700, 250), word(28, 680, 120), word(305, 680, 90)]
    assert.equal(isPageFrameGrid(grid([20, 265, 332, 575]), [cell(20, 786, 265, 821), cell(20, 20, 575, 786)], W, H, items), true)
  })

  it("keeps a table whose unruled body stays inside the header columns (예산서)", () => {
    const items = [word(80, 600, 200), word(340, 600, 60), word(412, 600, 60), word(486, 600, 60), word(80, 580, 150), word(340, 580, 50)]
    assert.equal(isPageFrameGrid(grid([20, 77, 335, 408, 482, 575]), [cell(20, 786, 77, 821), cell(20, 20, 575, 786)], W, H, items), false)
  })

  it("treats a one-cell page border as a frame and ignores small grids", () => {
    assert.equal(isPageFrameGrid(grid([20, 575]), [cell(20, 20, 575, 821)], W, H, [word(60, 700, 300)]), true)
    const small: TableGrid = { ...grid([20, 575]), bbox: { x1: 20, y1: 400, x2: 575, y2: 821 } }
    assert.equal(isPageFrameGrid(small, [cell(20, 400, 575, 821)], W, H, []), false)
  })
})
