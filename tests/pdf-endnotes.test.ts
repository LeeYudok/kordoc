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
})
