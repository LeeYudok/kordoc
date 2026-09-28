/**
 * 서울 방침서 프리셋(bangchim / 서울방침) — 정보소통광장 시장방침 편집형 계획서 정답지 5건 실측 골격.
 * 정본: 「청년취업사관학교 2.0」 추진계획(서울특별시장 제81호). 재현율: bench/gen-repro.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import JSZip from "jszip"
import { markdownToHwpx } from "../src/index.js"
import { resolveGongmun, PRESET_ALIAS } from "../src/hwpx/gongmun.js"
import { buildOutline, parseLeadingMarker } from "../src/hwpx/outline.js"
import { parseMarkdownToBlocks } from "../src/hwpx/md-runs.js"
import { pickScheme } from "../src/hwpx/gongmun-scheme.js"
import { flatSec } from "./gen-xml.js"

const md = `# 「청년취업사관학교 2.0」추진계획

- AI 인재양성 1089(십중팔구) 프로젝트 -

일자리정책과장 : 김덕환☎2133-5445 담당 : 이훈영☎5448

> AI 대전환 시기에 청년들의 미래형 일자리 진입을 촉진하기 위한 추진계획을 수립하고자 함

## 청년취업사관학교 1.0 운영성과

□ 기업의 AI 도입 수요 증가

ㅇ 제조·금융 등 산업 전반에 걸쳐 인공지능 전환 가속화

- 국내 제조업체 AI 기술 도입비율 확대

▸ 연도별 조성(누적) : ’21년 2개 → ’25년 25개

※ 취업대상자 : 수료자 중 진학 제외 인원

## 세부 추진계획

### 현장수요 대응형 교육체계 구축

#### 글로벌 빅테크 전담 캠퍼스 운영 : ’30년 10개소

#### 지역 산업거점별 특화 과정 운영

### 취업, 창업 프로그램 강화

#### 기업 연계 인턴십 프로그램 운영
`

const sec = async (m: string) => {
  const z = await JSZip.loadAsync(await markdownToHwpx(m, { gongmun: { preset: "서울방침" } }))
  return { sec: flatSec(await z.file("Contents/section0.xml")!.async("text")), head: await z.file("Contents/header.xml")!.async("text") }
}

describe("서울 방침서(bangchim) 프리셋 — 해석", () => {
  it("별칭 서울방침·방침서·방침 → bangchim, 서울 보고서 여백·장 상자·줄간격 200%", () => {
    for (const a of ["서울방침", "방침서", "방침", "bangchim"]) assert.equal(PRESET_ALIAS[a], "bangchim")
    const g = resolveGongmun({ preset: "서울방침" })
    assert.deepEqual(g.margins, { top: 13, bottom: 13, left: 18, right: 18 })
    assert.equal(g.h2Marker, "square")
    assert.equal(g.lineSpacing, 200)
  })

  it("스킴 — □ HY견고딕 17 보통 · ㅇ 한컴돋움 15 굵게 왼쪽 · - 휴먼명조 14 · ▸ 한컴돋움 13 · ※ 한컴돋움 13", () => {
    const s = pickScheme(resolveGongmun({ preset: "bangchim" }), true)
    assert.deepEqual([s.levels[0].font, s.levels[0].pt, s.levels[0].bold], ["HY견고딕", 17, false])
    assert.deepEqual([s.levels[1].font, s.levels[1].pt, s.levels[1].bold, s.levels[1].align], ["한컴돋움", 15, true, "LEFT"])
    assert.deepEqual([s.levels[2].font, s.levels[2].pt], ["휴먼명조", 14])
    assert.deepEqual([s.levels[3].font, s.levels[3].pt, s.marker(3, 0)], ["한컴돋움", 13, "▸"])
    assert.deepEqual([s.ref.font, s.ref.pt], ["한컴돋움", 13])
    assert.equal(s.lineSp, 200)
  })
})

describe("서울 방침서 — 아웃라인", () => {
  it("부호 없는 목록은 직전 명시 부호의 한 단계 아래 (ㅇ 뒤 '- …' → -)", () => {
    const o = buildOutline(parseMarkdownToBlocks("ㅇ 항목\n\n- 세부\n"), { gaejosik: true, consumeTitle: true, summaryFromQuote: true, listUnderMarker: true })
    assert.deepEqual(o.nodes.map((n) => n.kind === "item" ? n.depth : -1), [1, 2])
  })

  it("굵게가 부호를 감싼 줄·낫표가 붙은 ㅇ 도 항목 부호로 읽는다", () => {
    assert.deepEqual([parseLeadingMarker("**ㅇ 전문가 자문회의** (4회)").kind, parseLeadingMarker("**ㅇ 전문가 자문회의** (4회)").rest], ["box", "**전문가 자문회의** (4회)"])
    assert.equal(parseLeadingMarker("ㅇ『2024 인공지능산업 실태조사』에 따르면").depth, 1)
    assert.equal(parseLeadingMarker("**※ 필요시 타운홀 미팅 개최**").kind, "ref")
    // 한글 낱말은 부호가 아니다
    assert.equal(parseLeadingMarker("ㅇ영희").kind, null)
  })
})

describe("서울 방침서 — 골격", () => {
  it("제목표: 제목 HY헤드라인M 26 굵게 + 파랑 부제 18 + 담당 휴먼명조 12 균등배분, 요약박스 1×1", async () => {
    const { sec: s, head } = await sec(md)
    assert.match(s, /「청년취업사관학교 2\.0」추진계획/)
    assert.match(s, /- AI 인재양성 1089\(십중팔구\) 프로젝트 -/)
    assert.match(s, /일자리정책과장 : 김덕환☎2133-5445/)
    assert.ok(s.includes('name="__kordoc_summary"'), "요약박스")
    // 부제·담당은 본문 항목으로 새지 않는다
    assert.ok(!/<hp:t>AI 인재양성[^<]*<\/hp:t>/.test(s.replace(/- AI 인재양성 1089\(십중팔구\) 프로젝트 -/, "")))
    assert.match(head, /textColor="#0000FF"/)
    assert.match(head, /horizontal="DISTRIBUTE"/)
  })

  it("장은 [Ⅰ] 상자(1×3), 절은 번호 띠(#437FC1), 과제 소제목은 장 안에서 ❶❷❸ 로 이어 센다", async () => {
    const { sec: s, head } = await sec(md)
    assert.equal((s.match(/name="__kordoc_h2"/g) ?? []).length, 2)
    assert.match(s, /<hp:t>Ⅰ<\/hp:t>[\s\S]*<hp:t>Ⅱ<\/hp:t>/)
    assert.equal((s.match(/name="__kordoc_h3"/g) ?? []).length, 2)
    assert.match(head, /faceColor="#437FC1"/)
    assert.match(s, /<hp:t>❶ <\/hp:t>[\s\S]*<hp:t>❷ <\/hp:t>[\s\S]*<hp:t>❸ <\/hp:t>/)
  })

  it("▸ 는 부호 그대로 4단계, 캡션 줄 '< … >' 은 가운데", async () => {
    const { sec: s } = await sec(md + "\n< AI 과정 재편 전후 주요 변화 >\n")
    assert.match(s, /▸/)
    assert.match(s, /&lt; AI 과정 재편 전후 주요 변화 &gt;/)
  })
})
