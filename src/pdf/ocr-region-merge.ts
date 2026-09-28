import type { IRBlock } from "../types.js"

export interface ImageRegion { x1: number; y1: number; x2: number; y2: number }

/** Add OCR evidence only inside image regions with no PDF text layer. */
export function mergeOcrImageRegions(
  blocks: IRBlock[], page: number, regions: ImageRegion[], ocrBlocks: IRBlock[],
): number {
  let added = 0
  for (const region of regions) {
    const candidates = ocrBlocks.filter(block => {
      const b = block.bbox
      if (!b || b.page !== page || (block.type !== "table" && block.type !== "paragraph")) return false
      const overlapW = Math.max(0, Math.min(b.x + b.width, region.x2) - Math.max(b.x, region.x1))
      const overlapH = Math.max(0, Math.min(b.y + b.height, region.y2) - Math.max(b.y, region.y1))
      return overlapW * overlapH >= b.width * b.height * 0.8
    })
    const accepted = candidates.filter(b => {
      // 그림 속 글(차트 축·범례·로고 글) — 텍스트층이 없는 그림 영역의 OCR 문단
      if (b.type === "paragraph") return (b.text?.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 2
      const t = b.table
      if (b.type !== "table" || !t) return false
      if (t.rows === 1 && t.cols === 1) {
        const text = t.cells[0]?.[0]?.text ?? ""
        return (text.match(/\n/g)?.length ?? 0) >= 5 && (text.match(/\d/g)?.length ?? 0) >= text.length * 0.25
      }
      const headerLabels = t.cells[0]?.filter(c => c.text.replace(/[^A-Za-z가-힣]/g, "").length >= 2).length ?? 0
      return t.rows >= 2 && t.cols >= 2 && headerLabels >= t.cols * 0.75 &&
        t.cells.slice(1).some(row => row.filter(c => c.text.trim()).length >= 2)
    })
    // 표 모양이 아닌 OCR 표(머리 행 없는 화면 캡처 글줄 — ODL 072 유튜브 채널)는 버리지 않고 행마다 문단으로 — 그림 속 문단과 같은 대우
    const selected = candidates.flatMap(b => accepted.includes(b) ? [b] : b.type === "table" && b.table ? rowParagraphs(b)
      .filter(p => /[\p{L}\p{N}]{2}/u.test(p.text ?? "")) : [])
    for (const block of selected) {
      const b = block.bbox!
      const hasOriginal = blocks.some(existing => {
        if (existing.pageNumber !== page || !existing.bbox || existing.type === "image") return false
        const e = existing.bbox
        const x = Math.max(0, Math.min(e.x + e.width, b.x + b.width) - Math.max(e.x, b.x))
        const y = Math.max(0, Math.min(e.y + e.height, b.y + b.height) - Math.max(e.y, b.y))
        return x * y > b.width * b.height * 0.2
      })
      if (hasOriginal) continue
      // 그림 아래로 내려간 블록, 또는 그림과 높이가 겹치며 그 오른쪽에 놓인 블록(옆 캡션 "Figure 4.3- …", ODL 126) 앞에 끼운다
      const index = blocks.findIndex(existing => {
        const e = existing.bbox
        if (existing.pageNumber !== page || !e) return false
        const beside = e.y < region.y2 && e.y + e.height > region.y1 && e.x >= region.x2 - 1
        return e.y < b.y || beside
      })
      // 그림 속 글은 제목 후보가 아니다 — OCR 글자 크기(상자 높이 추정)를 떼어 뒤의 제목 승격이 보지 않게 한다
      const placed: IRBlock = block.type === "paragraph" ? { ...block, style: undefined } : block
      blocks.splice(index < 0 ? blocks.length : index, 0, placed)
      added++
    }
  }
  return added
}

/** OCR 표 → 행마다 문단(빈 칸 뺀 칸 글을 공백으로), 행 높이만큼 나눈 상자 */
function rowParagraphs(block: IRBlock): IRBlock[] {
  const t = block.table!, b = block.bbox!
  const h = b.height / t.rows
  return t.cells.map((row, r) => ({
    type: "paragraph" as const, pageNumber: block.pageNumber, text: row.map(c => c.text.trim()).filter(Boolean).join(" "),
    bbox: { ...b, y: b.y + h * (t.rows - 1 - r), height: h },
  }))
}
