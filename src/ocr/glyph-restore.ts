/**
 * 인식 결과 글리프 되살리기 — CTC 글자 자리(steps × stepPx, 박스 로컬 x)를 박스 픽셀로 옮겨 그 자리 잉크 조각 모양으로, 사전 밖이거나
 * 모델이 줄여·바꿔 읽는 글자를 고친다(괄호 「」【】·여는 따옴표·원문자·로마 숫자). 모양 판정은 line-split.ts, 여기는 글자열 배선만.
 * text 는 CTC 글자와 1:1 이어야 하고(아니면 그대로 돌려준다) restoreRoman 만 글자 수를 바꾸므로 맨 뒤에 부른다
 */
import { bracketFeatures, bracketShape, circledAt, grayCrop, inkStats, quoteHead, romanStems } from "./line-split.js"
import type { Box } from "./crop.js"

/**
 * 사전 밖 괄호 되살리기 — 인식 사전에 「」·【】 가 없어 모델은 모두 [ ] 로 읽는다(코퍼스 정답 「」44·｢｣23·【】41·[]159 쌍 ↔ OCR [ 274).
 * [ ] 글자의 CTC 시점을 박스 픽셀로 옮겨 그 자리 잉크 조각 모양을 본다: 【】 는 속이 찬 조각, 「 는 윗변 가로 획만, 」 는 아랫변
 * 가로 획만 있다([ ] 는 위아래 모두)
 */
export function restoreBrackets(rgba: Uint8Array, pageW: number, box: Box, text: string, steps: number[], stepPx: number): string {
  const chars = [...text]
  if (chars.length !== steps.length) return text
  const gray = grayCrop(rgba, pageW, box)
  const ink = inkStats(gray)
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== "[" && chars[i] !== "]") continue
    const f = bracketFeatures(gray, box.w, box.h, ink, (steps[i] + 0.5) * stepPx)
    const shape = f && bracketShape(f, chars[i] === "]")
    if (shape) chars[i] = shape
  }
  return chars.join("")
}

/**
 * 여는 따옴표 — 곧은 ' " 로 읽은 자리의 머리가 뚜렷이 아래(line-split quoteHead ≥ 0.49)면 ‘ “ 로 정한다. smartQuotes 문맥 규칙은
 * 연도 생략을 늘 ’ 로 두는데 "(‘11.3월 구성)"처럼 여는 따옴표로 쓴 문서가 있다. 닫는 쪽은 글꼴마다 겹쳐(작은 글씨 여는 따옴표 0.23~0.45,
 * 닫는 0.28~0.46 — 코퍼스 61곳 실측) 문맥에 맡긴다
 */
export function restoreQuotes(rgba: Uint8Array, pageW: number, box: Box, text: string, steps: number[], stepPx: number): string {
  const chars = [...text]
  if (chars.length !== steps.length) return text
  const gray = grayCrop(rgba, pageW, box)
  const ink = inkStats(gray)
  // smartQuotes 는 남은 곧은 따옴표를 홀짝으로 여닫으니, 짝 계산에 드는 자리를 바꾸면 나머지가 어긋난다 — 짝에서 빠지는
  // 연도 생략('24)과 그 줄에 하나뿐인 곧은 따옴표만 본다. 짝을 기다리는 여는 따옴표 뒤는 닫는 자리다(모델이 여는 쪽만 ‘ 로 읽은 줄)
  const year = (i: number) => chars[i] === "'" && !/[\p{L}\p{N}]/u.test(chars[i - 1] ?? "") && /^\d{2}(?!\d)/.test(chars.slice(i + 1, i + 4).join(""))
  const single = { "'": chars.filter((c, i) => c === "'" && !year(i)).length === 1, '"': chars.filter(c => c === '"').length === 1 }
  const open = { "'": false, '"': false }
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    const kind = c === "'" || c === "\u2018" || c === "\u2019" ? "'" : c === '"' || c === "\u201c" || c === "\u201d" ? '"' : null
    if (!kind) continue
    if (c !== kind) { open[kind] = c === "\u2018" || c === "\u201c"; continue }
    if (open[kind]) { open[kind] = false; continue }
    if (!year(i) && !single[kind]) continue
    const r = quoteHead(gray, box.w, box.h, ink, (steps[i] + 0.5) * stepPx)
    if (r !== null && r >= 0.49) { chars[i] = kind === "'" ? "\u2018" : "\u201c"; open[kind] = true }
  }
  return chars.join("")
}

/**
 * 원문자 숫자 되살리기 — 모델이 고리를 버리고 읽은 홀로 선 숫자 1~9(앞뒤가 숫자 아님)를 그 자리 고리 성분(line-split circledAt)으로
 * ①~⑨ 로 바꾼다. 글자 수 1:1 (restoreRoman 앞)
 */
export function restoreCircled(rgba: Uint8Array, pageW: number, box: Box, text: string, steps: number[], stepPx: number): string {
  const chars = [...text]
  if (chars.length !== steps.length) return text
  const at = chars.flatMap((c, i) => /[1-9]/.test(c) && !/\d/.test(chars[i - 1] ?? "") && !/\d/.test(chars[i + 1] ?? "") ? [i] : [])
  if (!at.length) return text
  const gray = grayCrop(rgba, pageW, box)
  const hit = circledAt(gray, box.w, box.h, inkStats(gray), at.map(i => (steps[i] + 0.5) * stepPx))
  at.forEach((i, k) => { if (hit[k]) chars[i] = String.fromCharCode(0x245f + Number(chars[i])) })
  return chars.join("")
}

/**
 * 로마 숫자 획 수 되살리기 — 모델은 한 글리프 Ⅲ 을 "II"·"I" 로, Ⅱ 를 "I" 로 줄여 읽는다(장 제목 "Ⅲ. 2026년 …" → "II. 2026년 …").
 * 라틴 글자에 붙지 않은 I·Ⅰ~Ⅲ 토막마다 그 자리 세로 획 수(line-split romanStems)를 세어 읽은 수와 다르면 Ⅰ~Ⅲ 한 글자로 바꾼다.
 * 숫자를 빠뜨리고 "." 부터 읽은 줄은 점 앞 잉크로 채운다.
 * text 는 CTC 글자와 1:1 이어야 한다(restoreBrackets 뒤)
 */
export function restoreRoman(rgba: Uint8Array, pageW: number, box: Box, text: string, steps: number[], stepPx: number): string {
  const chars = [...text]
  if (chars.length !== steps.length) return text
  const gray = grayCrop(rgba, pageW, box)
  const ink = inkStats(gray)
  const cx = (i: number) => (steps[i] + 0.5) * stepPx
  const ROMAN = /[I\u2160-\u2162]/, LATIN = /[A-Za-z]/
  const out: string[] = []
  // 숫자를 통째로 빠뜨리고 "." 부터 읽은 제목 줄(".세입·세출 …") — 점 앞 잉크가 세로 획이면 되살린다
  const k = chars.findIndex(c => c.trim())
  if (chars[k] === "." && chars.slice(k + 1).some(c => /[가-힣A-Za-z0-9]/.test(c))) {
    const n = romanStems(gray, box.w, box.h, ink, -Infinity, cx(k))
    if (n) out.push(String.fromCharCode(0x215f + n))
  }
  for (let s = 0; s < chars.length;) {
    if (!ROMAN.test(chars[s]) || (s > 0 && LATIN.test(chars[s - 1]))) { out.push(chars[s++]); continue }
    let e = s
    while (e < chars.length && ROMAN.test(chars[e])) e++
    const tok = chars.slice(s, e).join("")
    if (e < chars.length && LATIN.test(chars[e])) { out.push(tok); s = e; continue }
    let p = s - 1, q = e
    while (p >= 0 && !chars[p].trim()) p--
    while (q < chars.length && !chars[q].trim()) q++
    const n = romanStems(gray, box.w, box.h, ink, p >= 0 ? cx(p) : -Infinity, q < chars.length ? cx(q) : Infinity)
    const canon = n ? [["\u2160", "I"], ["\u2161", "II"], ["\u2162", "III"]][n - 1] : null
    out.push(canon && !canon.includes(tok) ? canon[0] : tok)
    s = e
  }
  return out.join("")
}
