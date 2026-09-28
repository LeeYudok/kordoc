/**
 * Print Renderer 테스트.
 *
 * `renderHtml`만 단위 테스트한다. `markdownToPdf`/`blocksToPdf`는 puppeteer-core +
 * Chromium 실행파일 의존이라 환경에 따라 결과가 달라지므로 통합 테스트로 분리 —
 * 예외는 페이지 잠금(JS 끔·요청 차단) 한 건: 실제 브라우저로만 확인되어 Chromium 이 있을 때만 돈다.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { renderHtml, markdownToPdf, findChromiumPath } from "../src/print/renderer.js"

describe("renderHtml — 기본", () => {
  it("plain markdown → HTML 문서 (DOCTYPE + body)", () => {
    const html = renderHtml("# 제목\n\n내용 한 줄.")
    assert.ok(html.startsWith("<!DOCTYPE html>"))
    assert.ok(html.includes('<html lang="ko">'))
    assert.ok(html.includes("<h1>제목</h1>"))
    assert.ok(html.includes("<p>내용 한 줄.</p>"))
  })

  it("default 프리셋 — A4 + Pretendard 11pt", () => {
    const html = renderHtml("hi")
    assert.ok(html.includes("@page { size: A4; margin: 20mm; }"))
    assert.ok(html.includes("Pretendard"))
    assert.ok(html.includes("font-size: 11pt"))
  })

  it("gov-formal 프리셋 — 휴먼명조 + 본문 들여쓰기", () => {
    const html = renderHtml("# 시행문\n\n수신: 각 부서장", { preset: "gov-formal" })
    assert.ok(html.includes("함초롬바탕"))
    assert.ok(html.includes("text-indent: 1em"))
    assert.ok(html.includes("margin: 25mm 20mm"))
  })

  it("compact 프리셋 — 1cm 여백 + 9pt", () => {
    const html = renderHtml("test", { preset: "compact" })
    assert.ok(html.includes("margin: 10mm"))
    assert.ok(html.includes("font-size: 9pt"))
  })

  it("워터마크 옵션 — 회전 텍스트 div 삽입", () => {
    const html = renderHtml("문서", { watermark: "대외비" })
    assert.ok(html.includes('class="watermark">대외비</div>'))
    assert.ok(html.includes("rotate(-30deg)"))
  })

  it("워터마크 미지정 시 div 삽입 안 함", () => {
    const html = renderHtml("문서")
    assert.ok(!html.includes('class="watermark"'))
  })

  it("HTML 특수문자 이스케이프 (워터마크)", () => {
    const html = renderHtml("x", { watermark: '<script>alert(1)</script>' })
    // 이스케이프된 형태로만 등장 (원본 태그 출현 안 함)
    assert.ok(!html.includes('">alert(1)</script></div>'))
    assert.ok(html.includes("&lt;script&gt;"))
  })

  it("extraCss 추가 가능", () => {
    const html = renderHtml("x", { extraCss: ".custom { color: red; }" })
    assert.ok(html.includes(".custom { color: red; }"))
  })

  it("표 렌더링 — markdown table → <table>", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |"
    const html = renderHtml(md)
    assert.ok(html.includes("<table>"))
    assert.ok(html.includes("<th>A</th>"))
    assert.ok(html.includes("<td>1</td>"))
  })

  it("HTML 표(kordoc XLSX/XLS 출력) 통과 — html: true", () => {
    const md = '<table><tr><th colspan="2">제목</th></tr></table>'
    const html = renderHtml(md)
    assert.ok(html.includes('colspan="2"'))
  })

  it("원문 HTML 스크립트와 이벤트 속성은 글로 표시하고 CSP를 넣는다", () => {
    const html = renderHtml('<script>globalThis.__unsafe = 1</script>\n\n<img src=x onerror="globalThis.__unsafe=2">')
    assert.ok(html.includes("&lt;script&gt;"), html)
    assert.ok(html.includes("&lt;img src=x onerror="), html)
    assert.ok(!/<script\b|<img[^>]+onerror/i.test(html), html)
    assert.ok(html.includes('Content-Security-Policy'), html)
  })

  it("병합 표 태그와 이미 이스케이프한 셀 글자를 유지한다", () => {
    const html = renderHtml('<table><tr><th colspan="2">A &amp; B &lt;script&gt;</th></tr></table>')
    assert.ok(html.includes('<th colspan="2">A &amp; B &lt;script&gt;</th>'), html)
    assert.ok(!html.includes('&amp;lt;script'), html)
  })
})

// Chromium 이 있을 때만 (render-document.test.ts 와 같은 조건) — 페이지 잠금은 실제 브라우저로만 확인된다
const HAS_CHROMIUM = existsSync("/Applications/Google Chrome.app") || !!findChromiumPath() || !!process.env.PUPPETEER_EXECUTABLE_PATH

describe("markdownToPdf — 인쇄 페이지 잠금 (JS 끔·data:/about: 밖 요청 차단)", { skip: !HAS_CHROMIUM }, () => {
  it("마크다운에 심은 <script>·원격 <img>·![](http://…) 가 실행·요청되지 않는다", async () => {
    const hits: string[] = []
    const srv = createServer((req, res) => { hits.push(req.url ?? ""); res.writeHead(404); res.end() })
    await new Promise<void>(r => srv.listen(0, "127.0.0.1", () => r()))
    const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`
    try {
      const pdf = await markdownToPdf([
        "# 잠금",
        `<img src="${base}/raw.png" onerror="fetch('${base}/onerror')">`,
        `<script>fetch('${base}/script')</script>`,
        `![x](${base}/md.png)`,
        `<img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">`,
      ].join("\n\n"))
      assert.equal(pdf.subarray(0, 4).toString(), "%PDF")
      await new Promise(r => setTimeout(r, 200))
      assert.deepEqual(hits, [], "로컬 서버가 받은 요청 없음")
    } finally {
      srv.close()
    }
  })
})

describe("renderHtml — 외부 브라우저에서 안전한 HTML", { skip: !HAS_CHROMIUM }, () => {
  it("기본 JS 설정으로 열어도 원문 스크립트가 실행되지 않는다", async () => {
    const hits: string[] = []
    const server = createServer((req, res) => { hits.push(req.url ?? ""); res.end() })
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const puppeteer = await import("puppeteer-core")
    const browser = await puppeteer.default.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? findChromiumPath()!,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    try {
      const page = await browser.newPage()
      await page.setContent(renderHtml(`<script>globalThis.__unsafe = 1; fetch('${base}/script')</script>\n\n![remote](${base}/image)`))
      assert.equal(await page.evaluate(() => (globalThis as typeof globalThis & { __unsafe?: number }).__unsafe), undefined)
      await new Promise(resolve => setTimeout(resolve, 100))
      assert.deepEqual(hits, [])
    } finally {
      await browser.close()
      server.close()
    }
  })
})
