/** PDF 미주 재배치 — 문서 끝 미주 묶음을 본문 참조 자리 뒤로 (src/pdf/endnotes.ts) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { relocateEndnotes } from "../src/pdf/endnotes.js"
import type { IRBlock } from "../src/types.js"

const p = (text: string): IRBlock => ({ type: "paragraph", text })
const texts = (bs: IRBlock[]) => bs.map(b => b.text)

describe("relocateEndnotes", () => {
  it("moves end notes after their unique reference blocks", () => {
    const out = relocateEndnotes([p("문1）첫 문제"), p("문2）둘째 문제"), p("문3）셋째 문제"), p("문1） 해설 1"), p("풀이 이어짐"), p("문2） 해설 2"), p("문3） 해설 3")])
    assert.deepEqual(texts(out), ["문1）첫 문제", "문1） 해설 1", "풀이 이어짐", "문2）둘째 문제", "문2） 해설 2", "문3）셋째 문제", "문3） 해설 3"])
  })

  it("pairs a mark repeated per elective section with its end notes in order", () => {
    // 선택과목마다 4번이 다시 시작한다 — 앞쪽 k번째 "문4）" 는 끝쪽 k번째 "문4）" 미주와 짝
    const out = relocateEndnotes([
      p("문1）공통"), p("문2）공통"), p("문3）공통"), p("확률과통계"), p("문4）확통 문제"), p("미적분"), p("문4）미적 문제"),
      p("문1） 해설 1"), p("문2） 해설 2"), p("문3） 해설 3"), p("문4） 확통 해설"), p("문4） 미적 해설"),
    ])
    assert.deepEqual(texts(out), ["문1）공통", "문1） 해설 1", "문2）공통", "문2） 해설 2", "문3）공통", "문3） 해설 3", "확률과통계", "문4）확통 문제", "문4） 확통 해설", "미적분", "문4）미적 문제", "문4） 미적 해설"])
  })

  it("does not treat a list restarting mid-way or page footnotes as end notes", () => {
    // 절마다 다시 시작하는 목록 — 앞 목록 (7)~(9) 가 한 번씩만 나와도 뒤 목록 (7)~(9) 는 미주가 아니다 (RFP 제안 요청 사항)
    const list = [p("(1) 가"), p("(7) 나"), p("(8) 다"), p("(9) 라"), p("(1) 마"), p("(7) 바"), p("(8) 사"), p("(9) 아")]
    assert.deepEqual(texts(relocateEndnotes(list)), texts(list))
    // 마지막 쪽 아래 각주 5)~9) — 1부터 시작하지 않는 번호는 문서 끝 미주 묶음이 아니다
    const foot = [p("기대효과5)"), p("장난감6), 액세서리"), p("표준화7)이며"), p("법8), 책임법9)"), p("5) 여기서의 기대효과"), p("6) 장난감"), p("7) 재료"), p("8) 법"), p("9) 법들")]
    assert.deepEqual(texts(relocateEndnotes(foot)), texts(foot))
  })

  it("leaves restarting numbered lists alone", () => {
    const blocks = [p("1) 가"), p("2) 나"), p("1) 다"), p("2) 라"), p("3) 마")]
    assert.deepEqual(texts(relocateEndnotes(blocks)), texts(blocks))
  })

  it("keeps numbered contents entries before their matching body sections", () => {
    const blocks = [
      p("목 차"), p("1) 조사 목적 ············· 3"), p("2) 조사 설계 ············· 3"), p("3) 조사 항목 ············· 3"),
      p("서문"), p("1) 조사 목적"), p("목적 설명"), p("2) 조사 설계"), p("설계 설명"), p("3) 조사 항목"), p("항목 설명"),
    ]
    assert.deepEqual(relocateEndnotes(blocks), blocks)
  })

  it("keeps contents entries even when they have no dot leaders", () => {
    const blocks = [
      p("1) Scope"), p("2) Method"), p("3) Results"), p("Preface"),
      p("1) Scope"), p("Scope text"), p("2) Method"), p("Method text"), p("3) Results"), p("Results text"),
    ]
    assert.deepEqual(relocateEndnotes(blocks), blocks)
  })

  it("does not use references inside a contents table", () => {
    const contents: IRBlock = {
      type: "table",
      table: {
        rows: 1, cols: 1, hasHeader: false,
        cells: [[{ text: "목 차\n1) 조사 연혁\n2) 조사 체계\n3) 조사 결과", colSpan: 1, rowSpan: 1 }]],
      },
    }
    const blocks = [
      contents, p("본문"), p("1) 조사 연혁"), p("연혁 설명"),
      p("2) 조사 체계"), p("체계 설명"), p("3) 조사 결과"), p("결과 설명"),
    ]
    assert.deepEqual(relocateEndnotes(blocks), blocks)
  })

  it("does not treat table captions as endnote marks", () => {
    const blocks = [
      p("표1) 조사 연혁"), p("표2) 조사 체계"), p("표3) 조사 결과"),
      p("표1) 조사 연혁"), p("연혁 설명"),
      p("표2) 조사 체계"), p("체계 설명"),
      p("표3) 조사 결과"), p("결과 설명"),
    ]
    assert.deepEqual(relocateEndnotes(blocks), blocks)
  })

  it("still moves numeric endnotes attached to body text", () => {
    const blocks = [
      p("첫 문장1)입니다"), p("둘째 문장2)입니다"), p("셋째 문장3)입니다"),
      p("1) 첫 주석"), p("2) 둘째 주석"), p("3) 셋째 주석"),
    ]
    assert.deepEqual(texts(relocateEndnotes(blocks)), [
      "첫 문장1)입니다", "1) 첫 주석",
      "둘째 문장2)입니다", "2) 둘째 주석",
      "셋째 문장3)입니다", "3) 셋째 주석",
    ])
  })
  it("keeps paragraph-start numbers in the uniqueness count (hwpx/pr-1674)", () => {
    // 번호가 절 머리("1) 개요")와 본문 참조("…현황1)") 두 곳에 나오면 어느 쪽이 참조인지 모른다 — 옮기지 않는다
    const blocks = [p("1) 개요"), p("추진 현황1) 정리"), p("2) 배경"), p("설명2) 이어짐"), p("3) 계획"), p("일정3) 확정"),
      p("1) 첫 주석"), p("2) 둘째 주석"), p("3) 셋째 주석")]
    assert.deepEqual(texts(relocateEndnotes(blocks)), texts(blocks))
  })
})
