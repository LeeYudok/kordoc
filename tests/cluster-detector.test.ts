import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { detectClusterTables, findTwoColumnProseCutX, sideTabGlyphs, type ClusterItem } from "../src/pdf/cluster-detector.js"

/** 헬퍼: 간단한 텍스트 아이템 생성 */
function item(text: string, x: number, y: number, w = 40, fontSize = 12): ClusterItem {
  return { text, x, y, w, h: fontSize, fontSize, fontName: "Test" }
}

describe("detectClusterTables", () => {
  it("2열 × 4행 정렬된 텍스트 → 테이블 감지", () => {
    // 2열 key-value 테이블 시뮬레이션
    const items: ClusterItem[] = [
      // col1(x=50), col2(x=200) — 갭이 fontSize*1.5 이상
      item("구분", 50, 400),    item("내용", 200, 400),
      item("이름", 50, 380),    item("홍길동", 200, 380),
      item("나이", 50, 360),    item("30세", 200, 360),
      item("주소", 50, 340),    item("서울시", 200, 340),
    ]

    const results = detectClusterTables(items, 1)
    assert.ok(results.length > 0, "테이블이 감지되어야 함")
    assert.equal(results[0].table.cols, 2)
    assert.ok(results[0].table.rows >= 3)
  })

  it("3열 × 3행 테���블 감지", () => {
    const items: ClusterItem[] = [
      item("번호", 50, 400), item("이름", 200, 400), item("금액", 350, 400),
      item("1", 50, 380),    item("사과", 200, 380), item("1000", 350, 380),
      item("2", 50, 360),    item("배", 200, 360),   item("2000", 350, 360),
    ]

    const results = detectClusterTables(items, 1)
    assert.ok(results.length > 0, "3열 테이블 감지")
    assert.equal(results[0].table.cols, 3)
  })

  it("단일 열 텍스트(문단) → 테이블 아님", () => {
    const items: ClusterItem[] = [
      item("첫째 줄 내용입니다", 50, 400, 200),
      item("둘째 줄 내용입니다", 50, 380, 200),
      item("셋째 줄 내용입니다", 50, 360, 200),
    ]

    const results = detectClusterTables(items, 1)
    assert.equal(results.length, 0, "단일 열은 테이블이 아님")
  })

  it("아이템이 너무 적으면 테이블 아님", () => {
    const items: ClusterItem[] = [
      item("A", 50, 400), item("B", 200, 400),
    ]
    const results = detectClusterTables(items, 1)
    assert.equal(results.length, 0)
  })

  it("빈 배열 → 빈 결과", () => {
    assert.deepEqual(detectClusterTables([], 1), [])
  })
})

/** 헬퍼: 2단 조판 본문 페이지 시뮬레이션 (국회 속기록류) */
function twoColumnProsePage(): ClusterItem[] {
  const items: ClusterItem[] = []
  // 좌단 x=50~280 / 우단 x=310~540, 각 12줄 — 마지막 줄 빼고 justify
  for (let r = 0; r < 12; r++) {
    const y = 700 - r * 20
    const lastL = r === 11
    const lastR = r === 5 // 우단 문단 끝 (짧은 줄)
    items.push({ text: "왼쪽단의본문문장조각입니다" + r, x: 50, y, w: lastL ? 120 : 230, h: 12, fontSize: 12, fontName: "T" })
    items.push({ text: "오른쪽단의본문문장조각입니다" + r, x: 310, y, w: lastR ? 110 : 230, h: 12, fontSize: 12, fontName: "T" })
  }
  return items
}

describe("findTwoColumnProseCutX (2단 조판 본문 판별)", () => {
  it("좌우 대칭 justify 본문 → 단 사이 컷 반환", () => {
    const cutX = findTwoColumnProseCutX(twoColumnProsePage())
    assert.ok(cutX !== null, "2단 본문으로 판별되어야 함")
    assert.ok(cutX > 280 && cutX < 310, `컷이 단 사이(280~310)여야 함: ${cutX}`)
  })

  it("짧은 라벨 열을 가진 진짜 표 → null", () => {
    const items: ClusterItem[] = []
    for (let r = 0; r < 12; r++) {
      const y = 700 - r * 20
      items.push({ text: "구분" + r, x: 50, y, w: 40, h: 12, fontSize: 12, fontName: "T" })
      items.push({ text: "내용값" + r, x: 310, y, w: 60, h: 12, fontSize: 12, fontName: "T" })
    }
    assert.equal(findTwoColumnProseCutX(items), null, "짧은 셀 표는 본문이 아님")
  })

  it("숫자 위주 2열(예산표) → null", () => {
    const items: ClusterItem[] = []
    for (let r = 0; r < 12; r++) {
      const y = 700 - r * 20
      items.push({ text: "1,234,567,890,123", x: 50, y, w: 230, h: 12, fontSize: 12, fontName: "T" })
      items.push({ text: "9,876,543,210,987", x: 310, y, w: 230, h: 12, fontSize: 12, fontName: "T" })
    }
    assert.equal(findTwoColumnProseCutX(items), null, "숫자 표는 본문이 아님")
  })

  it("detectClusterTables: 2단 조판 본문은 표로 감지하지 않음", () => {
    const results = detectClusterTables(twoColumnProsePage(), 1)
    assert.equal(results.length, 0, "2단 본문이 표로 흡수되면 안 됨")
  })

  it("오염 좌표(Infinity·과대 span)에서 폭주 없이 즉시 종료", () => {
    // 손상 PDF의 오염 CTM이 만드는 극단 좌표 — 스캔 루프 폭주 회귀 방지 (fuzz: bflip)
    const inf = twoColumnProsePage()
    inf.push({ text: "오염", x: Infinity, y: 700, w: 10, h: 12, fontSize: 12, fontName: "T" })
    const t0 = performance.now()
    findTwoColumnProseCutX(inf)
    const huge = twoColumnProsePage()
    huge.push({ text: "오염", x: 1e9, y: 700, w: 10, h: 12, fontSize: 12, fontName: "T" })
    findTwoColumnProseCutX(huge)
    assert.ok(performance.now() - t0 < 1000, "오염 좌표에서 1초 내 반환해야 함")
  })
})

describe("sideTabGlyphs — 쪽 옆 세로 색인 탭", () => {
  // 왼쪽 띠(x=37)에 한 자씩 찍힌 탭 글자 + 그 오른쪽 본문 줄(마지막 줄이 짧게 꺾임, 낱말마다 아이템)
  const tab = "응급의료기관평가기준집"
  const tabItems = [...tab].map((ch, k) => item(ch, 37, 700 - k * 12, 9, 9))
  const body: ClusterItem[] = [
    item("○ (목 적) 기존의 응급의료기관 평가와 재지정 평가를 통합 평가 체계로 일원화함으로써", 77, 700, 460, 10),
    item("응급의료기관", 96, 676, 71, 10), item("평가부터", 171, 676, 47, 10), item("시행", 222, 676, 24, 10), item(")", 246, 676, 4, 10),
    item("○ (평가체계)", 77, 652, 70, 10),
    item("- 1차 년도 : 서면평가", 90, 628, 125, 10),
    item("- 2차 년도 : 서면평가", 90, 604, 125, 10),
    item("- 3차 년도 : 현지평가, 재지정 평가 통합 시행", 90, 580, 260, 10),
    item("※ 전 지표는 매년 관리·운영 하여야 하며, 3년 주기 평가 지표는 전체 대상 기간을 평가 함", 97, 566, 410, 10),
  ]

  it("탭 글자 기둥을 찾는다(왼쪽·오른쪽)", () => {
    assert.equal(sideTabGlyphs([...tabItems, ...body]).size, tab.length)
    const mirrored = [...tabItems.map(i => ({ ...i, x: 560 })), ...body]
    assert.equal(sideTabGlyphs(mirrored).size, tab.length)
  })

  it("탭 글자와 옆 본문 줄을 표로 묶지 않는다", () => {
    assert.deepEqual(detectClusterTables([...tabItems, ...body], 1), [])
  })

  it("쪽 맨 왼쪽의 글머리 기호 기둥(▷·◦)은 탭이 아니다 — 책·장 이름은 글자·숫자다", () => {
    const rows: ClusterItem[] = []
    for (let k = 0; k < 8; k++) rows.push(item("▷", 40, 600 - k * 12, 8, 9), item(`목록 항목 ${k + 1} 의 본문 글`, 60, 604 - k * 12, 200, 9))
    assert.equal(sideTabGlyphs(rows).size, 0)
  })

  it("쪽의 다른 글보다 안쪽에 선 한 글자 기둥(서식 표의 세로 칸 이름)은 탭이 아니다", () => {
    const label = [..."응시자격요건"].map((ch, k) => item(ch, 70, 600 - k * 12, 9, 9))
    const body = [item("■ 공고문 제목은 쪽 왼끝에서 시작한다", 40, 680, 300), item("① 학사학위를 취득한 후 6년 이상 경력", 100, 590, 300)]
    assert.equal(sideTabGlyphs([...label, ...body]).size, 0)
  })

  it("표의 번호 열(줄마다 다른 칸과 같은 줄)은 탭이 아니다", () => {
    const rows: ClusterItem[] = []
    for (let k = 0; k < 8; k++) {
      rows.push(item(String(k + 1), 50, 400 - k * 20, 7), item(`항목${k + 1}`, 120, 400 - k * 20), item(`${(k + 1) * 100}`, 300, 400 - k * 20))
    }
    assert.equal(sideTabGlyphs(rows).size, 0)
    assert.ok(detectClusterTables(rows, 1).length > 0)
  })
})
