import { it } from "node:test"
import assert from "node:assert/strict"
import { removeHeaderFooterBlocks } from "../src/pdf/block-detect.js"
import type { IRBlock } from "../src/types.js"

function repeated(text: string, gap = 1, noteX = 50): IRBlock[] {
  return [1, 2, 3].flatMap(page => [
    { type: "table" as const, pageNumber: page, bbox: { page, x: 45, y: 97, width: 504, height: 600 } },
    { type: "paragraph" as const, text, pageNumber: page, bbox: { page, x: noteX, y: 97 - gap - 11, width: 269, height: 11 } },
  ])
}
const heights = new Map([[1, 830], [2, 830], [3, 830]])
it("반복 표 바로 아래 주석은 footer 영역에 들어가도 보존한다", () => {
  for (const label of ["주1) 2019a: 가계동향조사(소득부문)", "주: 통계 범위", "자료: 통계청", "출처: 공공데이터"]) {
    assert.deepEqual(removeHeaderFooterBlocks(repeated(label), heights, []), [])
  }
})
it("표와 떨어진 주석 모양 footer는 종전처럼 제거한다", () => {
  assert.deepEqual(removeHeaderFooterBlocks(repeated("자료: 통계청", 40), heights, []), [1, 3, 5])
})
it("표 옆의 반복 footer와 주석 표지 없는 running footer는 제거한다", () => {
  assert.deepEqual(removeHeaderFooterBlocks(repeated("자료: 통계청", 1, 550), heights, []), [1, 3, 5])
  assert.deepEqual(removeHeaderFooterBlocks(repeated("가계동향조사 보고서"), heights, []), [1, 3, 5])
})
it("드문드문 되풀이되는 절 제목(서식마다 첫 쪽)은 러닝 헤더가 아니다", () => {
  // 규제영향분석서: "Ⅰ. 규제의 필요성" 이 156쪽 중 10쪽(약 15쪽 간격) 머리 띠에 — 원본 서식의 제목이다
  const pages = [5, 21, 35, 49, 62]
  const blocks: IRBlock[] = pages.map(page => ({ type: "paragraph", text: "Ⅰ. 규제의 필요성", pageNumber: page, bbox: { page, x: 60, y: 780, width: 200, height: 14 } }))
  const hs = new Map(pages.map(p => [p, 830] as [number, number]))
  assert.deepEqual(removeHeaderFooterBlocks(blocks, hs, []), [])
  // 매 쪽 되풀이는 종전대로 머리글
  const every = [1, 2, 3, 4].map(page => ({ type: "paragraph" as const, text: "행정업무운영 편람", pageNumber: page, bbox: { page, x: 60, y: 780, width: 200, height: 14 } }))
  assert.deepEqual(removeHeaderFooterBlocks(every, new Map([1, 2, 3, 4].map(p => [p, 830] as [number, number])), []), [0, 1, 2, 3])
})
it("쪽 번호가 바뀌며 되풀이되는 바닥글은 드문드문해도 러닝 푸터다", () => {
  // hwp3-sample11 "DCT Technology Inc.\t55" — 여러 쪽에선 표에 흡수돼 따로 선 등장이 드문드문하다
  const pages = [6, 20, 41, 55]
  const blocks: IRBlock[] = pages.map(page => ({ type: "paragraph", text: `DCT Technology Inc.\t${page}`, pageNumber: page, bbox: { page, x: 60, y: 20, width: 400, height: 10 } }))
  assert.deepEqual(removeHeaderFooterBlocks(blocks, new Map(pages.map(p => [p, 830] as [number, number])), []), [0, 1, 2, 3])
})
