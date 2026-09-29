/**
 * PDF 쪽 넘김 표 — 쪼개진 행·쪽 경계에 걸친 칸 판정과 쪽 첫머리 클립 격자 보강.
 *
 * 법령 별표 한컴 PDF 실측(석유사업법 과태료 14쪽 151×76, 출입국관리법 과태료, 농어촌정비법 시설기준, 자동차종합검사
 * 시설·인력기준)을 합성 좌표로 옮겼다. 쪽을 넘은 칸의 뒤 조각은 글이 있어야 클립이 깔린다.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { joinSplitParts, mergeCrossPageTables } from "../src/pdf/table-parts.js"
import { mergeContinuedCells } from "../src/pdf/cell-continuation.js"
import { buildClipCellGrids } from "../src/pdf/clip-cells.js"
import { CLIP_TABLES, CONT_PARTS, FILLER_CELLS, TABLE_COLXS, recordCellLines } from "../src/pdf/table-meta.js"
import type { IRBlock, IRCell, IRTable } from "../src/types.js"
import type { LineSegment } from "../src/pdf/line-types.js"

/** 앵커 목록 → 덮인 자리까지 채운 IR 격자 ([행, 열, 글, 열병합, 행병합]) — 글이 null 이면 채움 칸(클립 없던 자리) */
function grid(rows: number, cols: number, anchors: Array<[number, number, string | null, number?, number?]>): IRTable {
  const cells: IRCell[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ text: "", colSpan: 1, rowSpan: 1 })))
  for (const [r, c, text, cs = 1, rs = 1] of anchors) {
    cells[r][c] = { text: text ?? "", colSpan: cs, rowSpan: rs }
    if (text === null) FILLER_CELLS.add(cells[r][c])
  }
  return { rows, cols, cells, hasHeader: rows > 1 }
}

/** 칸 글줄 기록 — [왼끝, 오른끝, 기준선] 줄마다 글자 크기 10 */
function lines(cell: IRCell, spec: Array<[number, number, number]>): void {
  recordCellLines(cell, spec.map(([l, r, y]) => ({ x: l, y, w: r - l, fontSize: 10, h: 10 })))
}

const h = (y: number, x1: number, x2: number, w = 0.36): LineSegment => ({ x1, y1: y, x2, y2: y, lineWidth: w })
const v = (x: number, y1: number, y2: number): LineSegment => ({ x1: x, y1, x2: x, y2, lineWidth: 0.36 })

describe("쪽 경계에 걸친 위 정렬 칸 — 글이 바닥까지 차고 문장이 이어진다", () => {
  // 위반행위 | 근거 법조문(글 없이 다음 쪽으로 넘어가 클립 없음) | 횟수. 앞 쪽 "차." 칸은 2행, 다음 쪽 조각은 2행
  const make = (tail: string): IRTable => {
    const prev = grid(3, 3, [[0, 0, "자. 과실로"], [0, 1, "법 1"], [0, 2, "1회"], [1, 0, `차. 과실로 인하여 법 제75조제1항 및 제2항에서 ${tail}`, 1, 2], [1, 1, "법 제100조", 1, 2], [1, 2, "3회"], [2, 2, "4회"]])
    lines(prev.cells[1][0], [[5, 95, 99], [5, 95, 77], [5, 90, 55]]) // 줄 간격 22pt, 끝줄 기준선이 밑변(30) 위 25pt
    return prev
  }
  const next = (): IRTable => grid(2, 3, [[0, 0, "경우를 포함한다) 또는 제2항", 1, 2], [0, 1, null], [0, 2, "5회"], [1, 1, null], [1, 2, "6회"]])

  it("관형형으로 끊긴 칸은 다음 쪽 조각과 한 칸 — 옆 열 칸이 경계를 넘을 때", () => {
    const res = joinSplitParts(make("준용하는"), [0, 100, 200, 300], next(), [0, 100, 200, 300], 0, 30)
    assert.ok(res)
    assert.equal(res.table.rows, 5)
    assert.equal(res.table.cells[1][0].rowSpan, 4)
    assert.match(res.table.cells[1][0].text, /준용하는\n경우를/)
    assert.equal(res.table.cells[1][1].rowSpan, 4)
    assert.equal(res.table.cells[3][2].text, "5회", "다른 열은 행이 새로 시작한다")
  })

  it("문장이 끝난 칸은 다음 쪽 새 칸과 잇지 않는다", () => {
    const res = joinSplitParts(make("준용한다."), [0, 100, 200, 300], next(), [0, 100, 200, 300], 0, 30)
    assert.ok(res)
    assert.equal(res.table.cells[1][0].rowSpan, 2)
    assert.equal(res.table.cells[3][0].text, "경우를 포함한다) 또는 제2항")
  })
})

describe("쪼개진 행의 옆 칸이 클립 없이 넘어왔으면 뒤 조각 여러 행 칸도 앞 칸의 나머지", () => {
  const prev = (): IRTable => grid(2, 3, [[0, 0, "구분"], [0, 1, "종류"], [0, 2, "기준"], [1, 0, "관광농원"], [1, 1, "영농체험시설"], [1, 2, "○ 식량작물 등이 입식된 농장"]])

  it("앞 쪽 끝 행에서 시작한 칸들이 다음 쪽 첫 띠에 클립이 없으면 첫 열 3행 칸을 앞 칸에 잇는다", () => {
    const curr = grid(3, 3, [[0, 0, "사업", 1, 3], [0, 1, null], [0, 2, null], [1, 1, "지역특산물"], [1, 2, "○ 지역농수산물"], [2, 1, "체육시설"], [2, 2, "○ 영업시설"]])
    const res = joinSplitParts(prev(), [0, 30, 100, 300], curr, [0, 30, 100, 300])
    assert.ok(res)
    assert.equal(res.split, true)
    assert.equal(res.table.rows, 4)
    assert.equal(res.table.cells[1][0].text, "관광농원\n사업")
    assert.equal(res.table.cells[1][0].rowSpan, 3)
    assert.equal(res.table.cells[1][1].rowSpan, 1)
    assert.equal(res.table.cells[2][1].text, "지역특산물")
  })

  it("옆 칸 조각에 클립이 있으면(새 행) 여러 행 칸은 새 묶음이다", () => {
    const curr = grid(3, 3, [[0, 0, "사업", 1, 3], [0, 1, "음식물"], [0, 2, "○ 식품"], [1, 1, "지역특산물"], [1, 2, "○ 지역농수산물"], [2, 1, "체육시설"], [2, 2, "○ 영업시설"]])
    const res = joinSplitParts(prev(), [0, 30, 100, 300], curr, [0, 30, 100, 300])
    assert.ok(res)
    assert.equal(res.split, false)
    assert.equal(res.table.rows, 5)
  })
})

describe("내어쓰기 문단이 쪽에서 갈린 칸 — 글 이어짐", () => {
  it("앞 쪽 끝줄이 문단 머리 자리에서 꽉 차고 뒤 쪽 줄이 모두 내어쓴 자리에서 이어지면 쪼개진 행", () => {
    const prev = grid(2, 2, [[0, 0, "3) 보고"], [0, 1, "법"], [1, 0, "4) 법 제38조의"], [1, 1, "법"]])
    const curr = grid(1, 2, [[0, 0, "2제1항을 위반 하여 석유제품의 판매가격을"], [0, 1, "제49조"]])
    lines(prev.cells[1][0], [[66, 157, 35]])
    lines(curr.cells[0][0], [[75, 157, 771], [75, 157, 756], [75, 157, 740]])
    const res = joinSplitParts(prev, [58, 160, 214], curr, [58, 160, 214])
    assert.ok(res)
    assert.equal(res.split, true)
    assert.equal(res.table.rows, 2)
    assert.match(res.table.cells[1][0].text, /^4\) 법 제38조의\n2제1항/)
  })

  it("뒤 쪽 둘째 줄이 첫 줄보다 나오면(들여쓰기 새 문단) 잇지 않는다", () => {
    const prev = grid(2, 2, [[0, 0, "3) 보고"], [0, 1, "법"], [1, 0, "4) 법 제38조의"], [1, 1, "법"]])
    const curr = grid(1, 2, [[0, 0, "새 문단이 들여 써서 시작한다"], [0, 1, "제49조"]])
    lines(prev.cells[1][0], [[66, 157, 35]])
    lines(curr.cells[0][0], [[75, 157, 771], [66, 157, 756]])
    const res = joinSplitParts(prev, [58, 160, 214], curr, [58, 160, 214])
    assert.ok(res)
    assert.equal(res.split, false)
  })

  it("내어쓴 끝줄은 그 자리부터 칸 오른끝까지를 줄 폭으로 본다 (좁은 칸 \"(나) 그 / 밖 의\")", () => {
    const prev = grid(2, 1, [[0, 0, "(가) 주 단 위"], [1, 0, "(나) 그 밖 의"]])
    const curr = grid(1, 1, [[0, 0, "보 고 의 경 우"]])
    lines(prev.cells[1][0], [[84, 132, 58], [101, 132, 42]])
    lines(curr.cells[0][0], [[101, 132, 771], [101, 132, 756], [101, 113, 740]])
    const res = joinSplitParts(prev, [58.3, 133.2], curr, [58.3, 133.2])
    assert.ok(res)
    assert.equal(res.split, true)
    assert.equal(res.table.cells[1][0].text, "(나) 그 밖 의\n보 고 의 경 우")
  })
})

describe("쪽 넘김 열 경계 합집합", () => {
  it("짜임이 다른 조각의 1pt 떨어진 경계는 다른 열 경계로 남긴다 (원본 격자가 따로 센다)", () => {
    const prev = grid(1, 2, [[0, 0, "가"], [0, 1, "나"]])
    const curr = grid(1, 3, [[0, 0, "다"], [0, 1, "라"], [0, 2, "마"]])
    const res = joinSplitParts(prev, [58.3, 158.8, 536.6], curr, [58.3, 159.8, 300, 536.6])
    assert.ok(res)
    assert.deepEqual(res.colXs, [58.3, 158.8, 159.8, 300, 536.6])
  })

  it("같은 짜임이 쪽마다 1pt 안에서 어긋나면 같은 열이다", () => {
    const prev = grid(1, 3, [[0, 0, "가"], [0, 1, "나"], [0, 2, "다"]])
    const curr = grid(1, 3, [[0, 0, "라"], [0, 1, "마"], [0, 2, "바"]])
    const res = joinSplitParts(prev, [58.05, 108.06, 151.48, 539.11], curr, [58.05, 108.54, 150.52, 539.11])
    assert.ok(res)
    assert.deepEqual(res.colXs, [58.05, 108.06, 151.48, 539.11])
    assert.equal(res.table.cells[1][1].text, "마")
  })
})

describe("세 쪽에 걸친 칸 — 이어짐 조각을 붙인 표는 끝난 쪽에서 다음 조각과 잇는다", () => {
  it("쪽 전체가 한 칸인 가운데 쪽을 넘어 셋째 쪽 표 조각을 잇는다", () => {
    const clip = (t: IRTable, xs: number[]): IRTable => { CLIP_TABLES.add(t); TABLE_COLXS.set(t, xs); return t }
    const first = clip(grid(2, 1, [[0, 0, "2. 검사장비"], [1, 0, "비고 1. 검사장비는 형식승인을 받은 것이어야 한다."]]), [73.8, 521.5])
    const mid = clip(grid(1, 1, [[0, 0, "7. 부하검사 대상 자동차에 대하여 관능 및 기능검사 전에 자동차 소유자에"]]), [73.8, 521.5])
    CONT_PARTS.set(mid, { x1: 73.8, x2: 521.5 })
    lines(mid.cells[0][0], [[81, 516, 500], [81, 516, 80]])
    const last = clip(grid(3, 2, [[0, 0, "게 무부하 급가속을 하는 사유를 설명하여야 한다.", 2], [1, 0, "구 분"], [1, 1, "자 격"], [2, 0, "책임자"], [2, 1, "정비기사"]]), [73.8, 146.2, 521.5])
    lines(last.cells[0][0], [[81, 516, 763], [81, 200, 744]])
    const H = new Map([[1, 842], [2, 842], [3, 842]])
    const blocks: IRBlock[] = [
      { type: "table", table: first, pageNumber: 1, bbox: { page: 1, x: 73.8, y: 70, width: 447.7, height: 600 } },
      { type: "table", table: mid, pageNumber: 2, bbox: { page: 2, x: 73.8, y: 70, width: 447.7, height: 706 } },
      { type: "table", table: last, pageNumber: 3, bbox: { page: 3, x: 73.8, y: 500, width: 447.7, height: 276 } },
    ]
    mergeContinuedCells(blocks, H)
    mergeCrossPageTables(blocks, H)
    assert.equal(blocks.length, 1)
    const t = blocks[0].table!
    assert.equal(t.rows, 4)
    assert.match(t.cells[1][0].text, /형식승인을 받은 것이어야 한다\.\n7\. 부하검사 .*소유자에\n게 무부하/)
    assert.equal(t.cells[2][0].text, "구 분")
  })
})

describe("buildClipCellGrids — 쪽 첫머리 클립 없는 띠·떨어진 조각", () => {
  const prevPage = { lastCells: [{ x1: 72.3, y1: 78.9, x2: 103, y2: 482.6 }], clips: [] }

  it("격자 위에 테두리만 그어진 빈 띠는 앞 쪽에서 넘어온 행의 조각 — 빈 첫 행으로 더한다", () => {
    const rects = [
      { x1: 184.8, y1: 699.9, x2: 518.2, y2: 733.8 },
      { x1: 103, y1: 531.6, x2: 184.8, y2: 699.9 }, { x1: 184.8, y1: 531.6, x2: 518.2, y2: 699.9 },
      { x1: 72.3, y1: 494.7, x2: 518.2, y2: 531.6 },
    ]
    const strokesH = [h(763.1, 71.8, 518.8), h(733.8, 184.7, 518.8), h(699.9, 102.9, 518.8)]
    const strokesV = [v(72.3, 531.6, 763.1), v(103, 531.6, 763.1), v(184.8, 531.6, 763.1), v(518.2, 531.6, 763.1)]
    const text = [{ x: 300, y: 720 }, { x: 150, y: 600 }, { x: 300, y: 600 }, { x: 300, y: 510 }]
    const g = buildClipCellGrids(rects, strokesH, strokesV, 595, 841, text, [], prevPage).grids
    assert.equal(g.length, 1)
    assert.equal(g[0].rowYs[0], 763.1)
    assert.ok(g[0].cells!.filter(c => c.row === 0).every(c => c.filler))
    // 앞 쪽이 표 칸으로 끝나지 않았으면 그대로
    assert.equal(buildClipCellGrids(rects, strokesH, strokesV, 595, 841, text).grids[0].rowYs[0], 733.8)
  })

  it("쪽 첫 띠의 글 있는 조각만 클립이 깔려 떨어져 있어도 아래 전폭 칸 위에 함께 놓이면 한 표", () => {
    const band = [[58.3, 133.2], [168.6, 190.3], [190.3, 212.2], [447.6, 469.7], [469.7, 490.7]].map(([x1, x2]) => ({ x1, y1: 737.1, x2, y2: 783 }))
    const floor = { x1: 58.3, y1: 684, x2: 536.6, y2: 737.1 }
    const below = [{ x1: 58.3, y1: 600, x2: 133.2, y2: 684 }, { x1: 133.2, y1: 600, x2: 536.6, y2: 684 }]
    const text = [...band.map(b => ({ x: (b.x1 + b.x2) / 2, y: 760 })), { x: 300, y: 710 }, { x: 90, y: 640 }]
    const g = buildClipCellGrids([...band, floor, ...below], [], [], 595, 841, text, [], prevPage).grids
    assert.equal(g.length, 1)
    assert.equal(g[0].cells!.filter(c => !c.filler).length, 8)
    // 앞 쪽 표가 없으면 떨어진 조각은 따로 묶인다
    assert.equal(buildClipCellGrids([...band, floor, ...below], [], [], 595, 841, text).grids.length, 3)
  })
})
