// 보이는 표 — HWPX 표 하나(칸 격자 + 칸 테두리)를 한글 화면에 보이는 모습대로 나눈다 (채점 기준 변경, v4.17.0).
// 한글 문서는 테두리를 안 보이게 한 표로 쪽을 짜는 일이 많다(법령 별표 272건 중 103건이 본문 전체를 틀 표에 담는다 —
// 할부거래법 시행령 [별표 1] 은 그림으로 보면 글과 분수뿐인데 HWPX 에는 8×7 표 하나). 정답은 hp:tbl 개수가 아니라 보이는 표다.
// 파서(src/table/)와 코드 공유 0% — 정의만 같고 구현은 독립이다. 정답이 파서 코드를 베끼면 채점이 누수된다 (pitfall #1).
//
// 정의
//  1. 변 가시성: 칸 borderFill 의 변이 type≠NONE·색≠#FFFFFF 면 보인다. 두 칸이 맞닿은 단위 변은 어느 쪽이라도 그으면 보이고,
//     병합 칸 안쪽은 변이 아니다.
//  2. 분수: 위아래로 붙은 두 칸 U(위)·D(아래)가 같은 열 범위·둘 다 rowSpan 1·둘 다 글만 든 한 문단(40자 이하, 수식·중첩 개체
//     없음)이고, 둘 사이 가로선이 두 칸 열 범위 전체에 보이되 그 경계에서 바로 옆 열로 이어지지 않으며, U 윗변·D 아랫변·두 칸
//     좌우 변이 모두 안 보이면 분수다. 두 행 병합 한 칸이 되고 그 글은 수식으로 친다(글 재현율 유닛에서 빼고 수식 존재 채점으로).
//     빈 칸은 분수 항이 아니다(글 아래 밑줄 한 줄일 뿐 — 정의에 없는 해석, 가정으로 명시).
//  3. 행 띠: 행 r 의 단위 세로 변(바깥 좌우 포함) 중 하나라도 보이거나, 행 r 을 덮는 칸이 둘 이상이고 행 r 윗변·아랫변 가로선이
//     표 온 폭에 모두 보이면 "표 행". 이어진 표 행 묶음 하나가 보이는 표 하나다. 표 행이 아닌 행은 글.
//  4. 보이는 표 = 그 묶음 안에서 시작하는 칸만(묶음 밖으로 나가는 rowSpan 은 묶음 끝에서 자름). 보이는 변이 닿는 열 범위 밖에
//     놓인 빈 칸(들여쓰기 칸)은 버리고, 어느 칸 모서리도 안 쓰는 행·열 경계(유령 격자선)는 접는다.
//  5. 칸 안 중첩표는 같은 정의를 재귀로 — 호출자(hwpx-ref.mjs processTable)가 칸마다 이 함수를 따로 부른다.

const NO_BORDER = { l: false, r: false, t: false, b: false }

/**
 * grid    : { rows, cols, anchors: [{ r, c, rs, cs, ... }] } — 트림 전 HWPX 칸 격자 (hwpx-ref buildRefGrid)
 * borderOf: anchor → { l, r, t, b } 변 가시성 (칸 borderFill)
 * isFracPart: anchor → 분수 항 자격(글만 든 한 문단·40자 이하·비지 않음)
 * isEmpty : anchor → 빈 칸(글·이미지·중첩 내용 없음)
 * 반환: { fractions: [[U, D]], segments: [{ band, r0, r1, anchors: [원 anchor…](시작 행 기준 row-major),
 *         table?: { rows, cols, cells: [{ anchor | fraction:[U, D], r, c, rs, cs }] } }] }
 */
export function visibleTables(grid, { borderOf, isFracPart, isEmpty }) {
  const { rows, cols } = grid
  const vc = grid.anchors.map(a => ({
    a, r: a.r, c: a.c, rs: Math.min(a.rs, rows - a.r), cs: Math.min(a.cs, cols - a.c), b: borderOf(a) ?? NO_BORDER,
  }))
  const own = new Int32Array(rows * cols).fill(-1)
  const place = i => {
    const v = vc[i]
    for (let dr = 0; dr < v.rs; dr++) for (let dc = 0; dc < v.cs; dc++) own[(v.r + dr) * cols + v.c + dc] = i
  }
  vc.forEach((_, i) => place(i))
  const at = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols ? -1 : own[r * cols + c])
  // 세로 단위 변 (경계 x, 행 r) · 가로 단위 변 (경계 y, 열 c) — 같은 칸 안쪽(또는 양쪽 다 빈 자리)이면 변이 아니다
  const vEdge = (x, r) => {
    const L = at(r, x - 1), R = at(r, x)
    return L !== R && ((L >= 0 && vc[L].b.r) || (R >= 0 && vc[R].b.l))
  }
  const hEdge = (y, c) => {
    const U = at(y - 1, c), D = at(y, c)
    return U !== D && ((U >= 0 && vc[U].b.b) || (D >= 0 && vc[D].b.t))
  }

  // ── 2. 분수 — 전부 원래 변으로 판정한 뒤 병합 (판정이 병합 순서에 매이지 않게) ──
  const fracPairs = []
  for (let i = 0; i < vc.length; i++) {
    const u = vc[i]
    if (u.rs !== 1 || !isFracPart(u.a)) continue
    const j = at(u.r + 1, u.c)
    if (j < 0) continue
    const d = vc[j]
    if (d.r !== u.r + 1 || d.c !== u.c || d.cs !== u.cs || d.rs !== 1 || !isFracPart(d.a)) continue
    const y = u.r + 1, c0 = u.c, c1 = u.c + u.cs
    let ok = !hEdge(y, c0 - 1) && !hEdge(y, c1)
    for (let c = c0; c < c1 && ok; c++) ok = hEdge(y, c) && !hEdge(u.r, c) && !hEdge(y + 1, c)
    if (ok) ok = !vEdge(c0, u.r) && !vEdge(c1, u.r) && !vEdge(c0, y) && !vEdge(c1, y)
    if (ok) fracPairs.push([i, j])
  }
  for (const [i, j] of fracPairs) {
    Object.assign(vc[i], { rs: 2, b: NO_BORDER, frac: [vc[i].a, vc[j].a] })
    vc[j].dead = true
    place(i)
  }

  // ── 3. 행 띠 ──
  const isTableRow = r => {
    for (let x = 0; x <= cols; x++) if (vEdge(x, r)) return true
    const covering = new Set()
    for (let c = 0; c < cols; c++) if (at(r, c) >= 0) covering.add(at(r, c))
    if (covering.size < 2) return false
    for (let c = 0; c < cols; c++) if (!hEdge(r, c) || !hEdge(r + 1, c)) return false
    return true
  }
  const segments = []
  for (let r = 0; r < rows; r++) {
    const band = isTableRow(r)
    const last = segments[segments.length - 1]
    if (last && last.band === band) last.r1 = r
    else segments.push({ band, r0: r, r1: r, anchors: [] })
  }
  const segOf = r => segments.find(s => r >= s.r0 && r <= s.r1)
  for (const a of [...grid.anchors].sort((x, y) => x.r - y.r || x.c - y.c)) segOf(a.r)?.anchors.push(a)

  // ── 4. 묶음 → 보이는 표 ──
  for (const seg of segments) {
    if (!seg.band) continue
    const { r0, r1 } = seg
    const members = vc.filter(v => !v.dead && v.r >= r0 && v.r <= r1).map(v => ({ ...v, rs: Math.min(v.rs, r1 + 1 - v.r) }))
    let xmin = Infinity, xmax = -Infinity
    for (let r = r0; r <= r1; r++) for (let x = 0; x <= cols; x++) if (vEdge(x, r)) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x) }
    for (let y = r0; y <= r1 + 1; y++) for (let c = 0; c < cols; c++) if (hEdge(y, c)) { xmin = Math.min(xmin, c); xmax = Math.max(xmax, c + 1) }
    const keep = members.filter(v => v.frac || !isEmpty(v.a) || (v.c + v.cs > xmin && v.c < xmax))
    if (!keep.length) continue
    const cx = [...new Set(keep.flatMap(v => [v.c, v.c + v.cs]))].sort((p, q) => p - q)
    const rx = [...new Set(keep.flatMap(v => [v.r, v.r + v.rs]))].sort((p, q) => p - q)
    const ci = x => cx.indexOf(x), ri = y => rx.indexOf(y)
    seg.table = {
      rows: rx.length - 1, cols: cx.length - 1,
      cells: keep.map(v => ({
        ...(v.frac ? { fraction: v.frac } : { anchor: v.a }),
        r: ri(v.r), c: ci(v.c), rs: ri(v.r + v.rs) - ri(v.r), cs: ci(v.c + v.cs) - ci(v.c),
      })),
    }
  }
  return { fractions: fracPairs.map(([i, j]) => [vc[i].a, vc[j].a]), segments }
}
