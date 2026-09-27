/**
 * 자간 벌린 글 — 글자 간격(Tc)을 넓힌 줄은 pdfjs 가 글자마다 공백을 넣어 "E M A I L R E B E C C A" 가 되고 진짜 낱말 사이 공백과
 * 구별되지 않는다(ODL 103 "EMAIL REBECCA.ALLEN@MSJ.EDU FOR MORE INFORMATION"). 연산자 목록의 글리프 흐름에는 진짜 공백 글리프만
 * 있으니, 한 글자·공백이 번갈아 나오는 아이템을 같은 글꼴의 글리프 흐름으로 다시 짠다. 흐름이 어긋나는 글꼴은 손대지 않는다.
 */

import { OPS, normalizeUnicode } from "pdfjs-dist/legacy/build/pdf.mjs"
import type { PdfTextItem } from "./text-line.js"

// 한글 균등배분("홍 보 지 원 반")은 normalizeItems·셀 글이 따로 다룬다 — 라틴·숫자·기호만
const TRACKED = /^(?:[^\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3] ){3,}[^\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]$/

export function restoreTrackedSpacing(items: PdfTextItem[], fnArray: ArrayLike<number>, argsArray: ArrayLike<unknown>): number {
  if (!items.some(it => TRACKED.test(it.str ?? ""))) return 0
  // 글꼴별 글리프 글 흐름 (공백 글리프 포함)
  const streams = new Map<string, string[]>()
  const saved: string[] = []
  let font = ""
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]
    const args = (argsArray as unknown[][])[i]
    if (fn === OPS.setFont) font = String(args[0])
    else if (fn === OPS.save || fn === OPS.paintFormXObjectBegin) saved.push(font)
    else if (fn === OPS.restore || fn === OPS.paintFormXObjectEnd) font = saved.pop() ?? font
    else if (fn === OPS.showText) {
      let list = streams.get(font)
      if (!list) streams.set(font, list = [])
      for (const g of args[0] as unknown[]) {
        if (g && typeof g === "object" && typeof (g as { unicode?: unknown }).unicode === "string") list.push(normalizeUnicode((g as { unicode: string }).unicode))
      }
    }
  }
  const cursor = new Map<string, number>()
  const failed = new Set<string>()
  let changed = 0
  for (const it of items) {
    const f = it.fontName ?? ""
    const glyphs = streams.get(f)
    if (!glyphs || failed.has(f) || typeof it.str !== "string") continue
    const want = it.str.replace(/\s+/g, "")
    if (!want) continue
    let gi = cursor.get(f) ?? 0
    // 아이템 첫 글자에 맞는 글리프까지 공백은 건너뛴다
    while (gi < glyphs.length && /^\s*$/.test(glyphs[gi])) gi++
    let got = "", text = ""
    while (gi < glyphs.length && got.length < want.length) {
      const g = glyphs[gi++]
      text += g
      got += g.replace(/\s+/g, "")
    }
    if (got !== want) { failed.add(f); continue }
    cursor.set(f, gi)
    if (TRACKED.test(it.str)) {
      const rebuilt = text.replace(/\s+/g, " ").trim()
      if (rebuilt.split(" ").length < it.str.split(" ").length) { it.str = rebuilt; changed++ }
    }
  }
  return changed
}
