/**
 * PPTX 파서 단위 테스트
 *
 * jszip으로 합성 PPTX 파일 생성 → 파싱 검증
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import JSZip from "jszip"
import { parse, parsePptx } from "../src/index.js"

const NS = `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" `
  + `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" `
  + `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

/** 개체 틀(type) 도형 — type 이 null 이면 일반 글상자, "obj" 면 type 없는 개체 틀 */
function sp(type: string | null, paras: string): string {
  const ph = type === null ? "" : type === "obj" ? `<p:ph idx="1"/>` : `<p:ph type="${type}"/>`
  return `<p:sp><p:nvSpPr><p:cNvPr id="1" name="s"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr/>`
    + `<p:txBody><a:bodyPr/>${paras}</p:txBody></p:sp>`
}

/** a:p — lvl·글머리표(buNone/buAutoNum/buChar) 지정 */
function para(text: string, opts?: { lvl?: number; bu?: "none" | "num" | "char" }): string {
  const bu = opts?.bu === "none" ? "<a:buNone/>" : opts?.bu === "num" ? `<a:buAutoNum type="arabicPeriod"/>` : opts?.bu === "char" ? `<a:buChar char="•"/>` : ""
  const lvl = opts?.lvl ? ` lvl="${opts.lvl}"` : ""
  return `<a:p><a:pPr${lvl}>${bu}</a:pPr><a:r><a:rPr lang="ko-KR"/><a:t>${text}</a:t></a:r></a:p>`
}

function slide(shapes: string, attrs = ""): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<p:sld ${NS}${attrs}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>`
    + `${shapes}</p:spTree></p:cSld></p:sld>`
}

interface SlideSpec {
  xml: string
  notes?: string
  /** 슬라이드 rels 에 추가할 <Relationship> */
  rels?: string
}

/** 최소 PPTX 생성 — slides 는 발표 순서. 파일 번호는 order 로 뒤섞을 수 있다 */
async function createPptx(slides: SlideSpec[], opts?: {
  /** 발표 순서 i 번째 슬라이드가 저장될 파일 번호 (기본 i+1) */
  fileNumbers?: number[]
  core?: string
  files?: Record<string, string | Uint8Array>
}): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`)
  const nums = opts?.fileNumbers ?? slides.map((_, i) => i + 1)
  const ids = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 10}"/>`).join("")
  zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS}><p:sldIdLst>${ids}</p:sldIdLst></p:presentation>`)
  zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${slides.map((_, i) => `<Relationship Id="rId${i + 10}" Type="${REL}/slide" Target="slides/slide${nums[i]}.xml"/>`).join("\n")}
</Relationships>`)
  slides.forEach((s, i) => {
    const n = nums[i]
    zip.file(`ppt/slides/slide${n}.xml`, s.xml)
    let rels = s.rels ?? ""
    if (s.notes !== undefined) {
      rels += `<Relationship Id="rIdN" Type="${REL}/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/>`
      zip.file(`ppt/notesSlides/notesSlide${n}.xml`, slide(sp("sldImg", "") + sp("body", para(s.notes))))
    }
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`)
  })
  if (opts?.core) zip.file("docProps/core.xml", opts.core)
  for (const [path, data] of Object.entries(opts?.files ?? {})) zip.file(path, data)
  return await zip.generateAsync({ type: "arraybuffer" })
}

describe("PPTX 파서", () => {
  it("parse()가 PPTX를 감지해 슬라이드를 쪽으로 파싱한다", async () => {
    const buffer = await createPptx([
      { xml: slide(sp("ctrTitle", para("분기 사업 보고")) + sp("subTitle", para("기획조정실"))) },
      { xml: slide(sp("title", para("추진 현황")) + sp("body", para("예산 집행"))) },
    ])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.fileType, "pptx")
    assert.equal(result.pageCount, 2)
    assert.equal(result.metadata?.pageMode, "layout")
    assert.ok(result.markdown.includes("# 분기 사업 보고"))
    assert.ok(result.markdown.includes("## 추진 현황"))
    assert.ok(result.markdown.includes("- 예산 집행"))
    assert.deepEqual(result.pages?.map(p => p.pageNumber), [1, 2])
    assert.ok(result.pages?.[0].markdown.includes("분기 사업 보고"))
    assert.ok(result.pages?.[1].markdown.includes("추진 현황"))
    assert.deepEqual(result.outline, [
      { level: 1, text: "분기 사업 보고", pageNumber: 1 },
      { level: 2, text: "추진 현황", pageNumber: 2 },
    ])
  })

  it("슬라이드 순서는 파일 번호가 아니라 presentation.xml 의 sldIdLst 를 따른다", async () => {
    const buffer = await createPptx(
      [{ xml: slide(sp("title", para("첫째 장"))) }, { xml: slide(sp("title", para("둘째 장"))) }],
      { fileNumbers: [2, 1] },
    )
    const result = await parsePptx(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.ok(result.markdown.indexOf("첫째 장") < result.markdown.indexOf("둘째 장"))
    assert.equal(result.blocks.find(b => b.text === "첫째 장")?.pageNumber, 1)
  })

  it("본문 개체 틀은 목록(수준 1 이상은 하위 항목), buNone 은 문단, buAutoNum 은 번호 목록", async () => {
    const buffer = await createPptx([{ xml: slide(sp("body",
      para("장비 점검") + para("담당 부서 확인", { lvl: 1 }) + para("안내 문구", { bu: "none" }) + para("1단계 착수", { bu: "num" }),
    ) + sp("obj", para("기본 개체 틀"))) }])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    const list = result.blocks.find(b => b.text === "장비 점검")
    assert.equal(list?.type, "list")
    assert.equal(list?.children?.[0].text, "담당 부서 확인")
    assert.equal(result.blocks.find(b => b.text === "안내 문구")?.type, "paragraph")
    assert.equal(result.blocks.find(b => b.text === "1단계 착수")?.listType, "ordered")
    assert.equal(result.blocks.find(b => b.text === "기본 개체 틀")?.type, "list")
    assert.ok(result.markdown.includes("- 장비 점검\n  - 담당 부서 확인"))
  })

  it("글상자는 문단이고, 명시한 글머리표만 목록이 된다", async () => {
    const buffer = await createPptx([{ xml: slide(sp(null, para("자유 글상자") + para("글머리 항목", { bu: "char" }))) }])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.blocks.find(b => b.text === "자유 글상자")?.type, "paragraph")
    assert.equal(result.blocks.find(b => b.text === "글머리 항목")?.type, "list")
  })

  it("쪽 번호·날짜·바닥글 개체 틀은 버린다", async () => {
    const buffer = await createPptx([{ xml: slide(
      sp("title", para("본문 제목")) + sp("sldNum", para("7")) + sp("dt", para("2026-01-01")) + sp("ftr", para("바닥글 문구")),
    ) }])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.ok(result.markdown.includes("본문 제목"))
    assert.ok(!result.markdown.includes("바닥글 문구"))
    assert.ok(!result.markdown.includes("2026-01-01"))
    assert.ok(!/(^|\n)7(\n|$)/.test(result.markdown))
  })

  it("그룹 도형 안의 글도 그리는 순서대로 읽는다", async () => {
    const buffer = await createPptx([{ xml: slide(
      sp(null, para("그룹 앞"))
      + `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="5" name="g"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${sp(null, para("그룹 안"))}</p:grpSp>`
      + sp(null, para("그룹 뒤")),
    ) }])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    const md = result.markdown
    assert.ok(md.indexOf("그룹 앞") < md.indexOf("그룹 안") && md.indexOf("그룹 안") < md.indexOf("그룹 뒤"))
  })

  it("글의 리터럴 $ 와 태그 꼴 글자는 IR 규약대로 이스케이프한다 — 수식·첨자로 읽히지 않는다", async () => {
    const result = await parse(await createPptx([{ xml: slide(sp(null, para("가격 $10 ~ $20, 닫는 태그 &lt;/sup&gt;"))) }]))
    assert.ok(result.success)
    assert.match(result.markdown, /가격 \\\$10 \\~ \\\$20, 닫는 태그 \\<\/sup>/)
  })

  it("표의 가로·세로 병합(gridSpan·rowSpan, hMerge·vMerge 연속 칸)을 원점 칸으로 합친다", async () => {
    const tc = (text: string, attrs = "") => `<a:tc${attrs}><a:txBody><a:bodyPr/>${text ? para(text) : "<a:p/>"}</a:txBody></a:tc>`
    const table = `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="4" name="t"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm/>`
      + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblGrid><a:gridCol w="1"/><a:gridCol w="1"/><a:gridCol w="1"/></a:tblGrid>`
      + `<a:tr h="1">${tc("구분", ` rowSpan="2"`)}${tc("일정", ` gridSpan="2"`)}${tc("", ` hMerge="1"`)}</a:tr>`
      + `<a:tr h="1">${tc("", ` vMerge="1"`)}${tc("시작")}${tc("종료")}</a:tr>`
      + `<a:tr h="1">${tc("준비")}${tc("3월")}${tc("4월")}</a:tr>`
      + `</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`
    const buffer = await createPptx([{ xml: slide(table) }])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    const t = result.blocks.find(b => b.type === "table")?.table
    assert.ok(t)
    assert.equal(t.rows, 3)
    assert.equal(t.cols, 3)
    assert.equal(t.cells[0][0].text, "구분")
    assert.equal(t.cells[0][0].rowSpan, 2)
    assert.equal(t.cells[0][1].text, "일정")
    assert.equal(t.cells[0][1].colSpan, 2)
    assert.equal(t.cells[2][2].text, "4월")
    assert.equal(result.blocks.find(b => b.type === "table")?.pageNumber, 1)
  })

  it("발표자 노트는 그 쪽 끝의 인용 문단이 된다", async () => {
    const buffer = await createPptx([{ xml: slide(sp("title", para("일정 안내"))), notes: "질의응답 시간을 10분 확보" }])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    const note = result.blocks.find(b => b.quote)
    assert.equal(note?.text, "발표자 노트: 질의응답 시간을 10분 확보")
    assert.equal(note?.pageNumber, 1)
    assert.ok(result.markdown.includes("> 발표자 노트: 질의응답 시간을 10분 확보"))
  })

  it("숨긴 슬라이드는 쪽 번호를 지키며 건너뛰고 경고한다", async () => {
    const buffer = await createPptx([
      { xml: slide(sp("title", para("공개 장"))) },
      { xml: slide(sp("title", para("숨긴 장")), ` show="0"`) },
      { xml: slide(sp("title", para("마지막 장"))) },
    ])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.ok(!result.markdown.includes("숨긴 장"))
    assert.equal(result.blocks.find(b => b.text === "마지막 장")?.pageNumber, 3)
    assert.equal(result.pageCount, 3)
    assert.ok(result.warnings?.some(w => w.code === "HIDDEN_TEXT_FILTERED" && w.page === 2))
  })

  it("그림은 이미지 블록과 추출 이미지로, images:false 면 바이트 없이 자리 표시만", async () => {
    const pic = `<p:pic><p:nvPicPr><p:cNvPr id="3" name="p"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rIdImg"/></p:blipFill><p:spPr/></p:pic>`
    const spec = { xml: slide(pic), rels: `<Relationship Id="rIdImg" Type="${REL}/image" Target="../media/image1.png"/>` }
    const buffer = await createPptx([spec, { ...spec }], { files: { "ppt/media/image1.png": PNG } })
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.images?.length, 1) // 두 장이 같은 그림을 써도 한 번만
    assert.equal(result.images?.[0].mimeType, "image/png")
    assert.deepEqual(result.blocks.filter(b => b.type === "image").map(b => [b.text, b.pageNumber]), [["image_001.png", 1], ["image_001.png", 2]])
    assert.ok(result.markdown.includes("![image](image_001.png)"))

    const noBytes = await parse(buffer, { images: false })
    assert.equal(noBytes.success, true)
    if (!noBytes.success) return
    assert.equal(noBytes.images, undefined)
    assert.ok(noBytes.markdown.includes("![image](image_001.png)"))
  })

  it("차트·SmartArt 는 글을 읽지 않고 경고한다", async () => {
    const chart = `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="6" name="c"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm/>`
      + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="x" r:id="rId9"/></a:graphicData></a:graphic></p:graphicFrame>`
    const buffer = await createPptx([{ xml: slide(chart) }])
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.ok(result.warnings?.some(w => w.code === "UNSUPPORTED_ELEMENT" && w.page === 1 && w.message.includes("차트")))
  })

  it("docProps/core.xml 메타데이터", async () => {
    const buffer = await createPptx([{ xml: slide(sp("title", para("표지"))) }], {
      core: `<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">`
        + `<dc:title>합성 발표 자료</dc:title><dc:creator>작성자</dc:creator><dcterms:created>2026-01-02T03:04:05Z</dcterms:created></cp:coreProperties>`,
    })
    const result = await parse(buffer)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.metadata?.title, "합성 발표 자료")
    assert.equal(result.metadata?.author, "작성자")
    assert.equal(result.metadata?.createdAt, "2026-01-02T03:04:05Z")
    assert.equal(result.metadata?.pageCount, 1)
  })

  it("DTD 엔티티 선언은 펼치지 않는다 (XXE·Billion Laughs)", async () => {
    const evil = `<?xml version="1.0"?><!DOCTYPE p:sld [<!ENTITY lol "LOLLOLLOL"><!ENTITY big "&lol;&lol;&lol;&lol;">]>`
      + slide(sp("title", para("&big;"))).replace(/^<\?xml[^>]*\?>/, "")
    const buffer = await createPptx([{ xml: evil }])
    const result = await parse(buffer)
    if (result.success) assert.ok(!result.markdown.includes("LOLLOL"))
  })

  it("ZIP 비압축 크기 상한을 넘으면 거부한다", async () => {
    const zip = new JSZip()
    zip.file("ppt/presentation.xml", `<p:presentation ${NS}/>`)
    zip.file("ppt/slides/slide1.xml", "a".repeat(101 * 1024 * 1024), { compression: "DEFLATE" })
    const buffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" })
    const result = await parse(buffer)
    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.fileType, "pptx")
    assert.match(result.error, /ZIP 비압축 크기 초과/)
  })

  it("presentation.xml 이 비어 있으면 파일 번호 순으로 슬라이드를 읽는다", async () => {
    const zip = new JSZip()
    zip.file("ppt/presentation.xml", `<p:presentation ${NS}><p:sldIdLst/></p:presentation>`)
    zip.file("ppt/slides/slide10.xml", slide(sp("title", para("열 번째"))))
    zip.file("ppt/slides/slide2.xml", slide(sp("title", para("두 번째"))))
    const result = await parse(await zip.generateAsync({ type: "arraybuffer" }))
    assert.equal(result.success, true)
    if (!result.success) return
    assert.ok(result.markdown.indexOf("두 번째") < result.markdown.indexOf("열 번째"))
  })
})
