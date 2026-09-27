/**
 * 미주를 참조 자리로 — 한컴 미주는 본문에 참조 표시("문1）")를 찍고 문서 끝에 같은 표시로 시작하는 미주 본문을 모아 찍는다.
 * HWPX·HWP5 파서는 미주를 참조 자리에 끼워 내므로(notes.ts) PDF 만 해설이 문서 끝에 몰려 순서가 어긋났다(수능 모의고사 해설).
 * 문서 뒤쪽의 미주 머리 블록마다 같은 표시가 앞쪽 본문(표 칸 글 포함)에 딱 한 번 나오고, 그 짝이 셋 이상 본문 순서대로 이어질 때만
 * 미주 묶음(머리 블록부터 다음 머리 전까지)을 참조 블록 바로 뒤로 옮긴다. 절마다 번호가 다시 시작되는 목록("1)")은 앞쪽에
 * 여러 번 나와 짝이 되지 않는다. 블록은 합치지 않고 옮기기만 한다(미주 안 표·수식 구조 유지)
 */

import type { IRBlock } from "../types.js"

const NOTE_MARK = /^\s*(\S{1,6}[）)])/

function blockText(b: IRBlock): string {
  if (b.table) return b.table.cells.flat().map(c => c.text).join("\n")
  return b.text ?? ""
}

export function relocateEndnotes(blocks: IRBlock[]): IRBlock[] {
  const texts = blocks.map(blockText)
  const heads: Array<{ idx: number; ref: number; shape: string }> = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.type !== "paragraph" && b.type !== "list" && b.type !== "heading") continue
    const m = NOTE_MARK.exec(texts[i])
    if (!m) continue
    const mark = m[1]
    let ref = -1, count = 0
    for (let j = 0; j < i && count < 2; j++) {
      let from = 0
      while (count < 2) {
        const at = texts[j].indexOf(mark, from)
        if (at < 0) break
        count++; ref = j; from = at + mark.length
      }
    }
    if (count === 1) heads.push({ idx: i, ref, shape: mark.replace(/\d+/g, "#") })
  }
  // 미주 머리는 한 가지 번호 꼴("문#）")이다 — 미주 안 소항목("ⅰ)"·"(나)")이 앞 미주 글과 짝지어져 구간을 끊지 않게 가장 흔한 꼴만
  const shapes = new Map<string, number>()
  for (const h of heads) shapes.set(h.shape, (shapes.get(h.shape) ?? 0) + 1)
  const main = [...shapes].sort((a, b) => b[1] - a[1])[0]?.[0]
  const mainHeads = heads.filter(h => h.shape === main && /#/.test(h.shape))
  // 문서 끝 쪽으로 이어진 짝 — 참조가 본문 순서대로 늘어나는 마지막 연속 구간
  let run: typeof heads = []
  for (const h of mainHeads) {
    if (run.length && (h.ref < run[run.length - 1].ref || h.ref >= run[0].idx)) run = []
    run.push(h)
  }
  if (run.length < 3) return blocks
  const start = run[0].idx
  // 구간 안에 짝 없는 머리가 있으면(다른 번호 체계) 손대지 않는다 — 앞 미주에 이어 붙은 본문 문단은 괜찮다
  const groups = run.map((h, k) => ({ ref: h.ref, blocks: blocks.slice(h.idx, k + 1 < run.length ? run[k + 1].idx : blocks.length) }))
  const tail = blocks.slice(start)
  if (groups.reduce((n, g) => n + g.blocks.length, 0) !== tail.length) return blocks
  const byRef = new Map<number, IRBlock[]>()
  for (const g of groups) byRef.set(g.ref, [...(byRef.get(g.ref) ?? []), ...g.blocks])
  const out: IRBlock[] = []
  for (let i = 0; i < start; i++) {
    out.push(blocks[i])
    const notes = byRef.get(i)
    if (notes) out.push(...notes)
  }
  return out
}
