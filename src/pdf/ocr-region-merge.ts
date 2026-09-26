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
    const selected = candidates.filter(b => {
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
      const index = blocks.findIndex(existing => existing.pageNumber === page && existing.bbox && existing.bbox.y < b.y)
      // 그림 속 글은 제목 후보가 아니다 — OCR 글자 크기(상자 높이 추정)를 떼어 뒤의 제목 승격이 보지 않게 한다
      const placed: IRBlock = block.type === "paragraph" ? { ...block, style: undefined } : block
      blocks.splice(index < 0 ? blocks.length : index, 0, placed)
      added++
    }
  }
  return added
}
