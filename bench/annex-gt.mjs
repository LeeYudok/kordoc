#!/usr/bin/env node
// 법령 별표 벤치 — 법제처 별표(licbyl-byl·licbyl-byl2)의 원본 HWP 와 한컴이 찍은 PDF 를 각각 파싱해, 같은 별표의 HWPX(rhwp 변환)
// XML 을 독립 추출기(ref/hwpx-ref.mjs, 파서와 코드 공유 0%)로 읽은 정답에 대조한다. 법령 MCP·lexdiff 가 별표를 이 두 경로로 읽는다.
//   글 : 재현율(빠진 글)·가짜 글 비율·읽기 순서 — compare-md-parsers 와 같은 정렬 채점
//   표 : 마크다운 표(파이프·HTML)를 격자화해 scoreTables 로 표 완전 일치·칸 F1. 1열 꾸밈 틀은 뺀다(compare-md-parsers 와 같음)
//        어느 칸 모서리도 놓이지 않은 행·열 경계(유령 격자선)는 정답·출력 양쪽에서 접는다 — 한글 편집기 격자에만 있는 선이라
//        화면에서 같은 표인데 열 수만 다르다(장사법 시행령 [별표 6] 과징금표: 보이는 3열, HWPX 격자 7열 중 4개 경계를 어느 칸도 안 씀)
// 기준선 (2026-09-29 v4.16.3): HWP 272문서 표 289/289·칸 F1 1.000·글 100% | PDF 표 236/289(81.7%)·칸 F1 0.955·글 99.95%
//
// 사용법: node bench/annex-gt.mjs [--gate] [--doc=부분문자열] [--verbose]
// 산출: bench/out/annex.json. --gate: 플로어(GATES) 미달 시 exit 1 (부분 실행 --doc 은 보고만)

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "../dist/index.js"
import { extractRef } from "./ref/hwpx-ref.mjs"
import { normKey, mdToPlain } from "./lib/normalize.mjs"
import { mdTables } from "./lib/md-tables.mjs"
import { alignUnits, lisLength } from "./lib/align.mjs"
import { collectIrGrids, scoreTables } from "./lib/table-score.mjs"

const root = fileURLToPath(new URL(".", import.meta.url))
const args = process.argv.slice(2)
const gateMode = args.includes("--gate")
const verbose = args.includes("--verbose")
const docFilter = (args.find(a => a.startsWith("--doc=")) ?? "").split("=")[1] || null
const SETS = ["licbyl-byl", "licbyl-byl2"]

const GATES = {
  hwp: { tableExact: 1, cellF1: 1, recall: 1 },
  pdf: { tableExact: 0.8166, cellF1: 0.9549, recall: 0.9994 },
  minDocs: 272,
}

/** 유령 격자선 접기 — 칸 모서리가 하나도 놓이지 않은 행·열 경계를 없앤 격자. cells 키는 정답(cells)·출력(anchors)이 다르다 */
function foldGrid(g, key) {
  const cells = g[key]
  if (!cells?.length) return g
  const colUsed = new Set([0, g.cols]), rowUsed = new Set([0, g.rows])
  for (const a of cells) { colUsed.add(a.c); colUsed.add(a.c + a.cs); rowUsed.add(a.r); rowUsed.add(a.r + a.rs) }
  const cx = [...colUsed].sort((x, y) => x - y), rx = [...rowUsed].sort((x, y) => x - y)
  if (cx.length - 1 === g.cols && rx.length - 1 === g.rows) return g
  const ci = x => cx.indexOf(x), ri = y => rx.indexOf(y)
  return {
    ...g, rows: rx.length - 1, cols: cx.length - 1,
    [key]: cells.map(a => ({ ...a, r: ri(a.r), c: ci(a.c), rs: ri(a.r + a.rs) - ri(a.r), cs: ci(a.c + a.cs) - ci(a.c) })),
  }
}

function scoreMd(md, ref) {
  const mdKey = normKey(mdToPlain(md).text)
  const units = ref.units.map(u => ({ id: u.id, kind: u.kind, text: normKey(u.text), tableIdx: u.tableIdx }))
  const { perUnit, buf } = alignUnits(units, mdKey)
  let matched = 0, total = 0
  for (let i = 0; i < perUnit.length; i++) {
    if (!/[\p{L}\p{N}]/u.test(units[i].text)) continue
    matched += perUnit[i].matched
    total += perUnit[i].total
  }
  let phantom = 0
  for (const [a, b] of buf.unconsumed()) phantom += (mdKey.slice(a, b).match(/[\p{L}\p{N}]/gu) ?? []).length
  const freq = new Map()
  for (const u of units) if (u.text) freq.set(u.text, (freq.get(u.text) ?? 0) + 1)
  const positions = []
  for (let i = 0; i < perUnit.length; i++) {
    const u = units[i], r = perUnit[i]
    if (u.kind !== "body" || r.pos < 0 || r.matched !== r.total) continue
    if ((u.text.match(/[\p{L}\p{N}]/gu) ?? []).length < 4 || freq.get(u.text) !== 1) continue
    positions.push(r.pos)
  }
  const multi = t => t.cols > 1
  const refTables = ref.tables.map(t => foldGrid(t, "cells")).filter(multi)
  const tbl = scoreTables(refTables, collectIrGrids(mdTables(md)).map(g => foldGrid(g, "anchors")).filter(multi))
  return {
    refChars: total, matchedChars: matched, phantomChars: phantom, mdChars: mdKey.length,
    order: positions.length ? lisLength(positions) / positions.length : 1,
    tables: refTables.length, tableExact: tbl.exactCount, cellF1: tbl.cellF1,
    missed: tbl.details.filter(d => !d.exact).map(d => `${d.refDims}→${d.irDims ?? "-"}`),
  }
}

const rows = []
let parseErrors = 0
for (const set of SETS) {
  const files = (await readdir(join(root, "corpus", set))).sort()
  for (const f of files) {
    if (!f.endsWith(".hwpx")) continue
    const stem = f.slice(0, -5)
    if (!files.includes(stem + ".hwp") || !files.includes(stem + ".pdf")) continue
    if (docFilter && !stem.includes(docFilter)) continue
    const ref = await extractRef(await readFile(join(root, "corpus", set, f)))
    for (const ext of ["hwp", "pdf"]) {
      // PDF 는 OCR 을 끈다 — 모델 캐시 유무로 기계마다 결과가 갈리지 않게, 그리고 법령 MCP·lexdiff 서버(모델 없음)와 같은 조건으로
      const res = await parse(await readFile(join(root, "corpus", set, `${stem}.${ext}`)), ext === "pdf" ? { ocr: false } : undefined)
        .catch(e => ({ success: false, error: String(e) }))
      if (!res.success) parseErrors++
      const s = scoreMd(res.success ? res.markdown : "", ref)
      rows.push({ set, stem, ext, ...s })
      if (verbose && s.tableExact < s.tables) console.log(`  ${ext} ${stem.slice(0, 60)}: 표 ${s.tableExact}/${s.tables} ${s.missed.join(" ")}`)
    }
  }
}

function summarize(list) {
  const sum = k => list.reduce((s, r) => s + r[k], 0)
  const withTables = list.filter(r => r.tables)
  return {
    docs: list.length,
    recall: +(sum("matchedChars") / Math.max(1, sum("refChars"))).toFixed(5),
    phantom: +(sum("phantomChars") / Math.max(1, sum("mdChars"))).toFixed(5),
    order: +(sum("order") / Math.max(1, list.length)).toFixed(5),
    tables: sum("tables"), tableExactCount: sum("tableExact"),
    tableExact: +(sum("tableExact") / Math.max(1, sum("tables"))).toFixed(5),
    cellF1: +(withTables.reduce((s, r) => s + r.cellF1, 0) / Math.max(1, withTables.length)).toFixed(5),
  }
}
const summary = { hwp: summarize(rows.filter(r => r.ext === "hwp")), pdf: summarize(rows.filter(r => r.ext === "pdf")) }
const gates = {}
for (const ext of ["hwp", "pdf"]) for (const k of ["tableExact", "cellF1", "recall"]) {
  gates[`${ext}.${k}`] = { value: summary[ext][k], threshold: GATES[ext][k], pass: summary[ext][k] >= GATES[ext][k] }
}
gates.parseErrors = { value: parseErrors, threshold: 0, pass: parseErrors === 0 }
gates.population = { value: summary.hwp.docs, threshold: GATES.minDocs, pass: docFilter !== null || summary.hwp.docs >= GATES.minDocs }
const pass = Object.values(gates).every(g => g.pass)

for (const ext of ["hwp", "pdf"]) {
  const x = summary[ext]
  console.log(`${ext.toUpperCase()} ${x.docs}문서: 표 완전 일치 ${x.tableExactCount}/${x.tables} (${(x.tableExact * 100).toFixed(2)}%) · 칸 F1 ${x.cellF1} · 글 재현율 ${x.recall} · 가짜 글 ${x.phantom} · 순서 ${x.order}`)
}
for (const [k, g] of Object.entries(gates)) if (!g.pass) console.log(`  ❌ ${k} ${g.value} (기준 ${g.threshold})`)
await mkdir(join(root, "out"), { recursive: true })
await writeFile(join(root, "out", "annex.json"), JSON.stringify({ generatedAt: new Date().toISOString(), summary, gates, pass, rows }, null, 1))
console.log(`report → bench/out/annex.json | ${pass ? "PASS ✅" : "FAIL ❌"}${gateMode ? "" : " (보고 전용 — --gate 시 exit code 반영)"}`)
if (gateMode && !pass && !docFilter) process.exit(1)
