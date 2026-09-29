# kordoc

**모두 파싱해버리겠다** — Parse them all.

[![npm version](https://img.shields.io/npm/v/kordoc.svg)](https://www.npmjs.com/package/kordoc)
[![license](https://img.shields.io/npm/l/kordoc.svg)](https://github.com/chrisryugj/kordoc/blob/main/LICENSE)

> *Korea's document hell is second to none. Built by a civil servant who survived seven years in it.*

HWP 3.x/5.x, HWPX, HWPML, PDF, XLS, XLSX, DOCX, images (PNG/JPG/WebP) — parse, compare, analyze, and generate every document format Korean government offices throw at you. [한국어](./README.md)

> 📊 **Public PDF benchmark (opendataloader-bench, 200 documents): overall 0.940 — higher than all 12 published PDF parsers (commercial included), at 0.05 s per page** (OCR 0.960 · OCR+plain 0.967). Korean government documents are scored against their original HWPX files; all 13,041 HWPX tables match cell for cell. → [Performance](#-performance)

[![kordoc — watch the demo](./docs/video-demo.jpg)](https://youtu.be/Q13GmgDcIw0)

<sub>▶ Click to play on YouTube. Narration is in Korean.</sub>

**Contents** — [Install](#-install) · [Features](#-features) · [Performance](#-performance) · [Quick Start](#-quick-start) · [CLI](#-cli) · [MCP Server](#-mcp-server) · [API](#-api) · [Supported Formats](#-supported-formats) · [Security](#-security) · [Recent Changes](#-recent-changes)

---

## ⚡ Install

All you need is Node.js 20+ (macOS / Linux / Windows).

### AI agent integration (MCP) — 30 seconds

```bash
npx -y kordoc setup
```

An interactive wizard picks your AI client (Claude Desktop · Cursor · Claude Code · Windsurf · VS Code · Gemini CLI · Zed · Antigravity · Codex — installed ones show `[detected]`) and patches its config file. Windows gets automatic `cmd /c npx` wrapping; Codex is registered through `codex mcp add` instead of editing its config. Restart the client and [17 document tools](#-mcp-server) are live.

### Claude Code plugin

To use a skill (SKILL.md) instead of MCP:

```
/plugin marketplace add chrisryugj/kordoc
/plugin install kordoc@kordoc
```

The kordoc skill auto-activates on `.hwp`/`.hwpx` mentions and official-document generation / form-filling requests (it calls the `npx -y kordoc@^4` CLI internally — no separate install).

### Library · CLI

```bash
npm install kordoc        # CLI only? no install needed: npx kordoc <file>
```

- Optional dependencies for PDF parsing (pdfjs-dist) and OCR (onnxruntime · sharp · pdfium) are **installed by default**. To slim the install use `--omit=optional` — PDF parsing, OCR, PNG rasterizing and some other features are then unavailable.
- Only `markdownToPdf`/`blocksToPdf` (print rendering) use the optional peer dependency `puppeteer-core` — `npm install puppeteer-core` if you need them.

<details>
<summary>Troubleshooting</summary>

- **`MODULE_NOT_FOUND` / `Cannot find module ...\dist\cli.js`** — a broken global install is lingering.
  ```powershell
  npm uninstall -g kordoc
  npx -y kordoc@latest setup
  ```
- **Windows PowerShell blocks `npx.ps1` (`PSSecurityException`)** — PowerShell's default policy blocks unsigned `.ps1` scripts (not kordoc). ① Run `npx -y kordoc setup` in **cmd** (safest), or ② from an admin PowerShell run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and restart PowerShell.
- **PNG rendering / image OCR fail with `MISSING_DEPENDENCY` (sharp) on network-restricted linux/x64** (#99) — the optional `onnxruntime-node` install script downloads CUDA binaries from `api.nuget.org`; when that fails npm also drops `sharp` and `@huggingface/transformers` (kordoc only uses CPU inference). `npm install sharp` does not fix an npx cache — skip the CUDA download:
  ```bash
  ONNXRUNTIME_NODE_INSTALL=skip npx -y kordoc@^4 <command> ...
  ```
- **Air-gapped networks** — see [Security · air-gapped](#-security).

</details>

---

## 💡 Features

| Feature | What it does |
| --- | --- |
| 📄 **Document → Markdown** | HWP3 · HWP5 · HWPX · HWPML · PDF · XLS · XLSX · DOCX and PNG/JPG/WebP images (automatic OCR) to LLM-friendly Markdown + structured IR (`IRBlock[]`) |
| 📊 **Table reconstruction** | Merged and nested tables keep their structure. All 13,041 tables in 2,286 HWPX documents lossless down to the cell (checked against an independent extractor); PDFs of the same documents, scored against the original HWPX (708 pairs, 2,632 tables), find 99.5% of tables and match 96.7% cell for cell. Borderless PDF tables and old-vs-new clause comparison tables in legislative amendments too |
| 🔍 **Redline (diff)** | Block- and cell-level differences between two documents (cross-format HWP ↔ HWPX works) |
| 📝 **Markdown → HWPX** | Turn AI-written text back into report-form HWPX — tables, equations (`<hp:equation>`) and charts included |
| 🏛️ **Government-standard documents** | An engine built by decoding 16 real government templates and 60 approved drafts. Gaejosik reports (cover, TOC banner, Roman-numeral chapter headers, page numbers, approval box), draft documents (statutory head/foot blocks, automatic "끝."), public-notice and press-release presets, 8-level Korean item numbering (1. 가. 1) 가) …), and a 19-rule official-notation linter (`kordoc lint`) — typesetting verified with Hancom COM rendering |
| 🔄 **Format-preserving roundtrip** | Edit the converted Markdown and hand it to `patchHwpx`/`patchHwp` — only changed paragraph/cell text is swapped, without touching a byte of the original formatting. Table row add/delete and filling empty HWP5 cells included |
| ✏️ **Form fill** | Fill blanks in application/report forms (font, size, alignment preserved). Exact name match on click-here fields; two built-in standard draft templates |
| 🔴 **Stamp / signature** | Finds anchors like "(인)" / "서명 또는 인" and floats a stamp PNG in front of text — tables and pages never grow (`kordoc seal`) |
| 🖼️ **Layout-preserving render** | SVG/PNG/PDF from Hancom's typesetting cache; cache-less generated files are typeset by a pure-TS reflow engine — multi-page, tables, shapes, highlighting. Previews without Hancom on the server |
| 📈 **Charts** | A Markdown ```` ```chart ```` fence (type/cat/series lines) becomes a native Hancom chart (OOXML chartSpace) — 20 types incl. bar, line, pie, donut, area, scatter, radar, with per-series/slice colors |
| 👓 **Built-in OCR** | Scanned PDFs and images on local CPU (PP-OCRv5 korean) — no API key, only the pages that need it, tables recovered from raster rules |
| 📑 **RAG · citations** | Structure chunks with heading/outline breadcrumbs (`--format chunks`) and per-page Markdown on **real page numbers** from the typesetting cache (`pages`) — cite "page N" in answers |
| 🕶️ **PII masking** | Detects resident/foreigner registration numbers, phone, email, card, account, business registration, passport and driver license numbers (opt-in names, addresses, corporate registration numbers, IP) and masks HWPX/HWP in place — body, tables, headers/footers, footnotes, text boxes, fields, previews and document info; exit 2 if anything remains. PDF/DOCX/XLSX etc. get masked Markdown only, the original is not modified (no PDF redaction). Text inside images and context-free bare names are not caught, so a human check before publishing is required |
| 🤖 **AI agents (MCP)** | Call the document tools directly from Claude Desktop, Cursor, Codex and friends |

---

## 📊 Performance

Every number is reproduced by `npm run bench:gate`, which every `npm publish` must pass.

### PDF → Markdown — ahead of the 12 engines on the public benchmark

[opendataloader-bench](https://github.com/opendataloader-project/opendataloader-bench) scores 200 PDFs (papers, reports, slides, posters, scans) against human-made ground truth for **reading order (NID), table structure (TEDS) and heading hierarchy (MHS)** (1.0 = identical to the ground truth).

| Rank | Engine | Overall | Reading order | Tables | Headings | Time / page |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| **1** | **kordoc default** (OCR model cached) | **0.940** | **0.943** | **0.936** | **0.935** | **0.05 s** |
| ref. | kordoc default (no OCR model) | 0.937 | 0.938 | 0.936 | 0.933 | 0.04 s |
| ref. | kordoc `plain: true` | 0.946 | 0.947 | 0.937 | 0.940 | 0.03 s |
| ref. | kordoc `plain: true, htmlTables: true` | 0.949 | 0.954 | 0.940 | 0.943 | 0.03 s |
| ref. | kordoc `ocr: true` | 0.960 | 0.960 | 0.979 | 0.949 | 0.46 s |
| ref. | kordoc `ocr: true, plain: true` | 0.967 | 0.968 | 0.981 | 0.956 | 0.46 s |
| ref. | kordoc `ocr: true, plain: true, htmlTables: true` | 0.973 | 0.977 | 0.983 | 0.959 | 0.46 s |
| 2 | opendataloader-hybrid | 0.907 | 0.934 | 0.928 | 0.821 | 0.46 s |
| 3 | nutrient (commercial) | 0.885 | 0.925 | 0.708 | 0.819 | 0.01 s |
| 4 | docling | 0.882 | 0.898 | 0.887 | 0.824 | 0.76 s |
| 5 | marker | 0.861 | 0.890 | 0.808 | 0.796 | 53.9 s |
| 6 | unstructured-hires | 0.841 | 0.904 | 0.588 | 0.749 | 3.01 s |
| 7 | edgeparse | 0.837 | 0.894 | 0.717 | 0.706 | 0.04 s |
| 8 | mineru | 0.831 | 0.857 | 0.873 | 0.743 | 5.96 s |
| 9 | opendataloader | 0.831 | 0.902 | 0.489 | 0.739 | 0.02 s |
| 10 | pymupdf4llm | 0.732 | 0.885 | 0.401 | 0.412 | 0.09 s |
| 11 | unstructured | 0.686 | 0.882 | 0.000 | 0.388 | 0.08 s |
| 12 | markitdown | 0.589 | 0.844 | 0.273 | 0.000 | 0.11 s |
| 13 | liteparse | 0.576 | 0.866 | 0.000 | 0.000 | 1.06 s |

- The default alone is **first on overall, reading order, tables and headings** — no GPU, cloud API or LLM, just Node.js.
- **OCR**: by default, when the OCR model is already cached (`kordoc models`, or an earlier `ocr: true`), only **pages without a text layer (scans, glyphs drawn as curves)** are OCR'd; without a cached model nothing is downloaded and a `NEEDS_OCR` warning is raised. Text inside images on pages that do have text is flagged with `SKIPPED_IMAGE` and read by `ocr: true` (charts, logos, scans → 0.960). `ocr: false` also turns off the automatic OCR.
- **`plain: true`** drops image placeholders, link URLs and underline/bold marks for indexing and RAG (the ground truth has none of these, so the score rises too). **`htmlTables: true`** emits every table as indented HTML.
- **Reproduction**: other engines' scores are the benchmark repository's published results (Apple M4 32GB); kordoc used the same PDFs, ground truth and the **unmodified evaluator** (Apple M4 24GB, 200 documents sequentially in one process). Re-scoring the repository's opendataloader-hybrid predictions with the same evaluator gives 0.9066, matching its published score. `node bench/odl-bench.mjs <bench clone>`, then the benchmark's `src/evaluator.py`.
- LM-Kit One (commercial; results-only PR #34, not merged) reports 0.948 without OCR and 0.963 with OCR. Most of the gap is table markup — it writes cells in the ground truth's HTML shape (`<td> text </td>`, header rows as `<td>`). Normalised to the same markup, kordoc `plain` scores 0.951 vs LM-Kit 0.948; with `htmlTables` kordoc leads both rows: 0.949 without OCR, 0.973 with OCR.

### Korean government documents — scored against the original HWPX

Real government documents (press releases, approval documents, statutory forms, budgets) for which both the HWPX original and its PDF export exist; text and tables extracted from the PDF are scored with the original as ground truth.

| Area | Size | Result |
| --- | --- | --- |
| HWPX text & tables | 2,286 documents, 13,041 tables | 0 missing text · every table matches cell for cell · reading order 100% |
| HWP 5.x | 1,120 HWP/HWPX pairs | identical to the HWPX result |
| PDF text | 744 pairs (HWPX/DOCX ground truth) | char recall 99.8% · precision 99.6% · reading order 99.1% · word F1 98.8% |
| PDF tables | 708 pairs, 2,632 tables | found 99.5% · exact cell match 97.0% · cell F1 0.984 |
| PDF overall | 1,911 documents (1,724 scored on the text layer) | text coverage 99.8% |
| Scanned OCR (built-in, local CPU) | 53 documents, 102 pages (216 dpi render) | char recall 99.0% · Hangul recall 99.4% · precision 99.4% · about 1 s/page |
| DOCX · XLSX · XLS · HML | 88 documents | 0 missing text or numbers |
| Markdown → HWPX → Markdown | 83 runs | no loss of text, tables, headings or equations |

> **Scoring rules** (revised 2026-09-29, details in the [CHANGELOG](CHANGELOG.md)) — for PDF text reading order, a line that appears several times counts at its in-order occurrence, and floating text boxes and lines without letters or digits (masking "*****") are excluded from order scoring only. List markers "- " and the footnote wrapper "(주: …)" are stripped from both plain texts. The PDF text/table populations exclude pairs whose PDF is a different edition (PDF text over 3×) and pairs whose PDF text layer (pdftotext) holds less than 93% of the ground-truth characters (render-defect repros etc.). PDF coverage removes leader-dot runs. OCR uses fixed sample pages (`bench/ocr-pages.json`); OCR text inside image regions with no text-layer text (for logos mixed into a body block, only the surplus explained by reading the image alone) and text-layer text that is never drawn (white or covered text) are left out of the character comparison, and pages that draw in-line characters as images are dropped from the sample. Characters pixels cannot tell apart (middle dots · • ∙, unit ㎡ vs m², corner brackets ｢｣ 「」) are folded, and table rows whose value cells stack several lines side by side are unfolded by line index.

### HWP · HWPX → Markdown — against HwpForge with the same scorer

The same corpus converted by [HwpForge](https://github.com/ai-screams/HwpForge) 0.16.6 (`to_md`, lossy) and by kordoc, both scored against the **original HWPX XML** (tables from both outputs go through the same Markdown table parser; single-column tables excluded).

| | kordoc | HwpForge 0.16.6 |
| --- | ---: | ---: |
| HWPX, 2,305 docs — conversion failures | **0** | 123 |
| HWPX — text recall (converted docs only) | **100.00%** (100.00%) | 59.23% (98.64%) |
| HWPX — exact tables (9,123) | **100.0%** (9,122) | 32.2% |
| HWPX — cell F1 | **1.000** | 0.428 |
| HWP 5.x, 1,108 docs — conversion failures | **0** | 19 |
| HWP — text recall | **100.00%** | 86.41% |
| HWP — exact tables (3,111) | **100%** | 27.0% |
| HWP — cell F1 | **1.000** | 0.349 |

- HwpForge focuses on generation and editing; its Markdown uses pipe tables only, so merged cells cannot be expressed — most of the table gap.
- Single-column tables (1,288) are decorative frames — 43% title/body boxes, 28% blank spacer frames, 3% lists — so table vs. lines is a presentation choice, and their text is scored by text recall. Including them: HWPX 10,392 tables, kordoc 90.6% vs HwpForge 36.0%; HWP 3,500 tables, 92.8% vs 32.1%.
- The HWP count excludes one pair whose HWPX is distribution-encrypted (no ground truth). Reproduce: `bench/hwpforge-bench.py`, then `node bench/compare-md-parsers.mjs <output dir>` (`--include-single-col` to include single-column tables).

---

## 🚀 Quick Start

### Parse a document

```typescript
import { parse } from "kordoc"
import { readFileSync } from "fs"

const result = await parse(readFileSync("business-plan.hwpx"))   // a file path string works too

if (result.success) {
  result.markdown   // markdown
  result.blocks     // IRBlock[] structured data
  result.metadata   // { title, author, createdAt, pageMode, ... }
  result.pages      // [{ pageNumber, markdown }] per-page body
}
```

- `pages` appears only for formats whose blocks carry page numbers (HWP · HWPX · PDF; XLS(X): one sheet = one page). DOCX, which has no page numbering, omits the field.
- Page-boundary reliability is `metadata.pageMode` — `"layout"` (real pages from the typesetting cache) / `"section"` (section approximation).

**Parse options** (`parse(buffer, options)` · CLI flag)

| Option | CLI | Description |
| --- | --- | --- |
| `pages` | `-p, --pages` | `"1-3"` · `"1,3,5-7"` · `[1, 5, 10]` — real pages for PDF and Hancom-saved files, section approximation without a typesetting cache |
| `ocr` | `--ocr` · `--ocr-force` | unset (default): only pages without a text layer, when the model is cached · `true`: pages that need OCR + text in images (~18MB model downloaded on first use) · `"force"`: every page · `false`: off · function: external OCR provider |
| `formulaOcr` | `--formula-ocr` | PDF formula OCR (MFD+MFR, ~155MB models) — detected formulas as `$…$` / `$$…$$` |
| `images` | `--no-images` | `false` skips image bytes (placeholders remain; PDF skips PNG encoding) |
| `plain` | `--plain` | text-first Markdown without image placeholders, link URLs, underline or bold (headings, lists and table structure kept; `blocks` unchanged) |
| `htmlTables` | `--html-tables` | every table as HTML, one tag per indented line (first row `<th>`) |
| `password` | `--password` | open password (HWPX · HWP3 · HWP5; not Hancom DRM) |
| `tables` | `--no-tables` | `false` turns off PDF table detection (two-column exam sheets whose boxes read as tables and flip the order) |
| `removeHeaderFooter` | `--no-header-footer` | remove PDF running headers/footers (default on, 3+ pages) |
| `keepTrailingEmptyCols` | `--keep-empty-cols` | keep empty trailing table columns (form input columns) |
| `keepEmptyParagraphs` | `--keep-empty-paragraphs` | keep empty paragraphs — source paragraph count = line count (HWPX) |
| `includeFieldPlaceholders` | `--include-field-placeholders` | also emit unfilled click-here field guide text (HWPX · HWP5) |
| `dedupeRunningHeaders` | `--dedupe-headers` | drop running headers repeated per page in HWP5 layout tables (opt-in: may also drop per-attachment renumbering) |
| `inlineImages` | `--inline-images` | inline images as base64 data URIs (BMP→PNG, HWP5) |
| `classifyTables` | — | classify tables as data / layout / uncertain into `IRTable.classification` |
| `onProgress` | — | progress callback `(current, total)` |

### Compare documents (redline)

```typescript
import { compare } from "kordoc"

const diff = await compare(oldBuffer, newBuffer)   // cross-format HWP ↔ HWPX works
// diff.stats → { added: 3, removed: 1, modified: 5, unchanged: 42 }
// diff.diffs → BlockDiff[] (tables include cell-level diffs)
```

### Extract and fill form fields

```typescript
import { parse, extractFormFields, fillForm } from "kordoc"
import { readFileSync, writeFileSync } from "fs"

const r = await parse(buffer)
if (r.success) {
  const form = extractFormFields(r.blocks)
  // form.fields → [{ label: "성명", value: "홍길동", row: 0, col: 0 }, ...], form.confidence → 0.85
}

// HWPX format-preserving mode — fonts, sizes, alignment intact
const filled = await fillForm(readFileSync("application.hwpx"), {
  성명: "홍길동", 주민등록번호: "900101-1234567", 주소: "서울특별시 광진구 능동로 120",
}, "hwpx-preserve")
writeFileSync("application_filled.hwpx", Buffer.from(filled.output as ArrayBuffer))
// filled.fill.filled → filled fields, filled.fill.unmatched → keys that failed to match
```

### Built-in standard draft templates + click-here fields

Standard draft-document HWPX files based on the forms annexed to the 「Enforcement Rules of the Regulation on Administrative Efficiency and Collaboration」 ship with the package, so you can produce a properly laid-out official document by name alone (form assets: [rhwp](https://github.com/edwardkim/rhwp) tools/forms, MIT — `THIRD_PARTY/rhwp-forms.txt`).

| Name | Form | Use | Click-here fields |
|------|------|-----|-------------------|
| `gian` (general draft) | Annex Form No. 1 | outgoing / cooperation documents | 23 — agency name, recipient, via, title, body, attachments, sender, drafter, reviewer, approver, enforcement number, … |
| `gian-simple` (simple draft) | Annex Form No. 2 | internal approval reports/plans (approval table) | 13 — registration number, approval titles 1–4, title, summary, date, … |

```bash
npx kordoc fill --list-templates                                # built-in templates + fields
npx kordoc fill --template gian -j values.json -o draft.hwpx
npx kordoc fill templates:간이기안문 -f '제목=…' -o report.hwpx   # positional form works too
```

- The fill engine **matches click-here (CLICK_HERE) fields by exact name first**, then falls back to label matching — works on any HWPX form with click-here fields (mail-merge forms etc.).
- Values containing `\n` (like `본문`) become in-paragraph line breaks; a value equal to the guide text is not lost; the original charPr formatting is kept.
- API: `extractClickHereFields(buf)` (inspect fields) · `readBuiltinTemplate(resolveBuiltinTemplate("gian")!)` (load a template) → `fillHwpx(buf, values)`. The MCP `fill_form` tool takes the same templates via its `template` parameter.

### Generate HWPX (Markdown → HWPX)

```typescript
import { markdownToHwpx } from "kordoc"

const hwpx = await markdownToHwpx("# Title\n\nBody\n\n| Name | Rank |\n| --- | --- |\n| 홍길동 | 과장 |")

// display math → native HWPX equations (<hp:equation>) — LaTeX-like subset: \frac, \sqrt, scripts, Greek, integrals/limits, arrows, relations, matrices
await markdownToHwpx("Pythagoras\n\n$$a^2 + b^2 = c^2$$")

// official-document mode — 8-level item numbering + hanging indent + official margins / serif fonts
// preset: official | report | plan | notice | minutes | gaejosik | press | ministry (work report) | bangchim (Seoul policy plan)
await markdownToHwpx("1. 추진배경\n  - 세부 항목\n2. 추진계획", { gongmun: { preset: "보고서" } })

// government-standard gaejosik report — cover, TOC (banner), Roman-numeral chapter headers, body title box, page numbers ("- 1 -", not on cover/TOC)
await markdownToHwpx(md, {
  gongmun: {
    preset: "개조식",
    cover: { org: "Agency", date: "2026. 7. 11." },
    toc: true,                          // h2 list → Ⅰ Ⅱ Ⅲ TOC (on by default for gaejosik)
    approval: ["담당", "팀장", "과장"],   // approval box (optional)
    pageNumbers: true,                  // page numbers (on by default for gaejosik/report/plan)
    endMark: false,                     // "끝." at the end (on by default for drafts)
  },
})
```

- Tables get measured government table grammar automatically: shaded bold header with a double bottom rule, 0.4mm outer-border hierarchy, shaded label column, content-proportional column widths (numeric columns at fixed real width), narrower than the body and right-aligned.
- Accepts a theme (`HwpxTheme` — heading/body/quote/table-header color and weight), a table format profile from a reference document (`hwpxToProfile` → `{ profile }`) and page options.
- CLI: `kordoc generate report.md -o report.hwpx --preset 개조식 --org Agency --approval 담당,팀장,과장` (`--toc/--no-toc` `--cover/--no-cover` `--page-numbers` `--end-mark` `--no-body-title-box` `--fonts` `--sizes`).

### Layout-preserving render

Draws the typesetting cache Hancom stores in HWPX (line coordinates, cell grids, object anchors) as absolutely positioned SVG — fast, no typesetting engine, no Hancom on the server. Multi-page vertical stack, search-term highlighting and drawing shapes are supported. Files without a cache (`markdownToHwpx` output, AI-generated or edited files) are typeset by the **pure-TS reflow engine**. Equation objects are not rendered yet.

```typescript
import { renderHwpxToSvg, renderDocument, extractRenderedRegions } from "kordoc"

const r = await renderHwpxToSvg(readFileSync("approval.hwpx"), { highlights: ["예산"] })
// r.svg, r.width/r.height (pt), r.pageCount, r.stats { texts, images, tables }, r.warnings
const g = await renderHwpxToSvg(generatedHwpx, { reflow: true })   // cache-less files

// unified renderer — HWPX and HWP (5.x), per-page PNG + table crops
const { scene, assets } = await renderDocument("approval.hwp", { format: "png", pages: "1-2" })
const crops = await extractRenderedRegions("approval.hwp", { types: ["table"] })
```

CLI: `kordoc render approval.hwpx -o approval.svg` — cache-less documents are reflowed by default (`--no-reflow` disables), `--highlight 예산,집행`, `--reflow-mode keep|charAll`. For continuous rendering use `kordoc render-worker` (stdin NDJSON, for preview apps).

### Bulk conversion — persistent parse worker

```typescript
await parse(buffer, { images: false })                   // no image bytes
await parse(buffer, { plain: true, htmlTables: true })   // text-first + every table as HTML
```

`kordoc parse-worker` stays running and answers one line per stdin JSON request — no new node process per file.

```text
ready     {"ready":true,"version":"4.16.0","protocol":1}
request   {"id":1,"file":"doc.hwpx","images":false,"ocr":"off"}
response  {"id":1,"rss":183500800,"result":{ …same as --format json, failures as success:false… }}
quit      {"cmd":"quit"}  (or close stdin)
```

Requests accept `ocr` (`"off"` · `"auto"` (only pages that need it) · `"force"`), `formulaOcr` and `password`; the response's `rss` (memory) lets the host decide when to recycle the worker.

### OCR (scanned / image-based PDFs)

```typescript
await parse(buffer, { ocr: true })      // pages that need OCR + text in images (PP-OCRv5 korean, ~18MB model on first use)
await parse(buffer, { ocr: "force" })   // force every page
await parse(buffer, {                   // external OCR (Claude Vision, Tesseract, …)
  ocr: async (pageImage, pageNumber, mimeType) => myOcrService.recognize(pageImage),
})
```

- **No API key or external service** — det (line detection) + rec (CTC recognition) ONNX on local CPU (official PaddlePaddle conversions, Apache-2.0 / Korean dictionary of 11,945 characters — all 11,172 precomposed Hangul syllables + jamo, Latin, symbols).
- **Per page** — only scanned pages and pages with broken ToUnicode (`needsOcr`) are OCR'd; clean pages keep their parsed output. For the default automatic OCR see [parse options](#parse-a-document).
- **Tables survive** — OCR line boxes go through the block pipeline (XY-Cut reading order + cluster table detection), so table structure is recovered from scans.
- Model management: `kordoc models --status` (`--export`/`--import` for air-gapped sideloading).

### PDF text-quality signals

PDFs often have a text layer with broken ToUnicode/CMap or control characters mixed in. `parsePdf` returns per-page quality signals.

```typescript
const r = await parsePdf(buffer)
if (r.success && r.qualitySummary?.needsOcr) await parse(buffer, { ocr: true })   // or route to your OCR queue
for (const p of r.pageQuality ?? []) if (p.needsOcr) console.log(`p${p.page} needs review: ${p.ocrReason}`)
```

Signal keys: `textChars` · `hangulRatio` · `controlCharRatio` · `replacementCharRatio` · `puaRatio` / `needsOcr` (page & document level) / `ocrReason` — `low_text` · `high_pua` · `high_control` · `high_replacement` · `garbled_hangul` · `vector_text` (glyphs drawn as curves, so the text layer has no text).

---

## 💻 CLI

```bash
# convert
npx kordoc business-plan.hwpx                       # print to terminal
npx kordoc report.hwp -o report.md                  # save to file (images in images/report/)
npx kordoc *.pdf -d ./converted/                    # batch conversion
npx kordoc review.hwpx --format json                # JSON (blocks + pages + metadata)
npx kordoc review.pdf --format chunks               # RAG structure chunks (breadcrumbs + standalone tables)
npx kordoc report.hwpx --pages 1-3                  # page range
npx kordoc scan.pdf --ocr                           # built-in OCR (--ocr-force for every page)
npx kordoc locked.hwpx --password 'secret'          # password-protected HWPX/HWP3/HWP5
npx kordoc exam.pdf --no-tables                     # turn off PDF table detection
npx kordoc doc.pdf --format json --no-images        # no images (also --plain, --html-tables)

# fill forms
npx kordoc fill form.hwpx -f '성명=홍길동,주소=서울' -o filled.hwpx
npx kordoc fill form.hwpx -j values.json -o filled.hwpx
npx kordoc fill form.hwpx --dry-run                                 # list fields only (incl. click-here)
npx kordoc fill form.hwpx -j values.json --formats '{"날짜":"yy.mm.dd"}' # per-field value format
npx kordoc fill form.hwpx -j values.json --require-unique           # refuse if one key matches 2+ spots
npx kordoc fill form.hwpx -j values.json --mask                     # don't echo filled values to stdout
npx kordoc fill --template gian -j values.json -o draft.hwpx        # built-in draft template (--list-templates)

# generate · edit · verify
npx kordoc generate report.md -o report.hwpx --preset 보고서         # Markdown → official HWPX
npx kordoc patch original.hwpx edited.md -o patched.hwpx            # format-preserving patch (.hwp auto)
npx kordoc seal form.hwpx --image stamp.png --anchor "(인)" -o sealed.hwpx
npx kordoc validate output.hwpx                                     # HWPX structure validation (ZIP, required parts, XML)
npx kordoc lint report.md                                           # 19-rule notation linter (md/txt, '-' = stdin, exit 1 on errors)
npx kordoc profile agency-form.hwpx                                 # table format profile JSON → generate --profile

# PII masking
npx kordoc redact complaint.hwpx -o redacted.hwpx                   # format-preserving masking + re-scan (exit 2 if anything remains)
npx kordoc redact complaint.hwpx --mask-char '*' -o redacted.hwpx   # mask character (default ●)
npx kordoc redact contract.hwp --rules rrn,phone,crn --json --dry-run  # pick rules + per-location report only (crn, IP are opt-in)
npx kordoc redact complaint.hwpx --rules rrn,phone,email,name,address -o redacted.hwpx  # names and addresses too (opt-in)
npx kordoc redact notice.pdf                                        # PDF/DOCX/etc.: masked .redacted.md only

# render
npx kordoc render approval.hwpx -o preview.svg                      # layout-preserving SVG (reflow when cache-less)
npx kordoc render approval.hwpx --format png --pages 2-4 -d ./pages # also PNG, JPEG, HTML, PDF
npx kordoc render approval.hwpx --reflow-mode charAll -o preview.svg # reflow line breaking: keep (word, default) | charAll (character)

# models · watch
npx kordoc models --status                          # OCR model status (--export/--import for air-gapped sideloading)
npx kordoc check-ocr-models --status-only           # status only as JSON (without the flag, missing models are downloaded)
npx kordoc check-formula-models --status-only       # formula OCR models (MFD+MFR+tokenizer, ~155MB) status only
npx kordoc watch ./inbox -d ./converted             # folder watch (keeps subfolders)
npx kordoc watch ./docs --webhook https://api/hook  # webhook notification
```

- `watch -d` mirrors subfolders into the output: `inbox/team/report.hwpx` → `converted/team/report.md`.
- `check-ocr-models` and `check-formula-models` **download** what is missing or fails its SHA check, despite the name — pass `--status-only` to inspect only.
- `kordoc lint` inspects **text (Markdown/txt)**. For HWPX, lint the source Markdown or pipe: `kordoc doc.hwpx | kordoc lint -`. `generate` raises warnings from the same rules; `END_MARK_MISSING` only fires in `lint`, which sees the finished draft.

### Failure contract — machine-readable failure JSON

Conversion failures emit the same failure JSON to stdout **in every `--format` (markdown · json · chunks)** and exit 1 — branch on `code`, not on stderr text.

```json
{ "success": false, "fileType": "hwpx", "file": "report.hwpx", "error": "…", "code": "ENCRYPTED" }
```

- Never collides with success output: markdown success is text, chunks success is a JSON **array**, a failure is always a `success:false` **object**. With `-o`/`-d` no output file is produced for a failed input; with multiple inputs each failure emits one JSON.
- **Stability**: the exit codes (0 success / 1 failure) and fields (`success` · `fileType` · `error` · `code`) are stable; `code` values and the `file` (basename) field are only ever **added**. The `error` string is for humans and not part of the contract.

| `code` | Meaning |
|---|---|
| `ENCRYPTED` | open password required (`--password`) or wrong |
| `DRM_PROTECTED` | Hancom document security (DRM) — cannot be opened |
| `UNSUPPORTED_FORMAT` | unsupported format |
| `CORRUPTED` | signature mismatch or unrecoverable damage |
| `IMAGE_BASED_PDF` | scanned PDF without a text layer (needs `--ocr`) |
| `ZIP_BOMB` / `DECOMPRESSION_BOMB` | decompression-bomb guard triggered |
| `NO_SECTIONS` | no body sections |
| `OUTPUT_TOO_LARGE` | output serialization exceeds the runtime string limit |
| `MISSING_DEPENDENCY` | optional dependency not installed (pdfjs-dist, …) |
| `EMPTY_INPUT` | empty input |
| `FILE_NOT_FOUND` | input path does not exist (ENOENT) |
| `PARSE_ERROR` | any other parse failure |

### Image bundles — `images/<document name>/manifest.json`

When saving with `-o`/`-d`, extracted images go to a per-document folder `images/<document name>/` (the `-o` output name or the `-d` input name without its extension) with a `manifest.json`, and Markdown links point there (spaces and parentheses percent-encoded). Converting several documents into one folder never overwrites images. `--format json --image-refs` keeps only these paths instead of image bytes.

```json
[ { "name": "image_001.png", "mimeType": "image/png", "bytes": 68, "source": "BinData/image1.png" } ]
```

- `mimeType` **prefers magic-byte detection** (PNG/JPEG/GIF/BMP/WMF/EMF); undetectable formats (TIFF, SVG, …) keep the declared value.
- `source` is the original container entry (HWPX/DOCX ZIP path, HWP5 BinData storage name); absent for re-encoded images such as PDF.
- Extensions: **PDF always `png`** (pure-JS re-encode) · HWP5 sniffed `png/jpg/gif/bmp` (`bin` for WMF/EMF) · HWPX extension-derived `png/jpg/gif/bmp/tif/wmf/emf/svg` (`bin` for unknown) · DOCX keeps the original extension. Images are not re-encoded otherwise — trust the manifest for the format.

---

## 🤖 MCP Server

Automatic setup: [`npx -y kordoc setup`](#ai-agent-integration-mcp--30-seconds). Manual registration:

```bash
codex mcp add kordoc -- npx -y kordoc mcp          # Codex
```

```json
{ "mcpServers": { "kordoc": { "command": "npx", "args": ["-y", "kordoc", "mcp"] } } }
```

On Windows, if Claude Desktop can't find `.cmd`, use `"command": "cmd", "args": ["/c", "npx", "-y", "kordoc", "mcp"]`.

**17 tools**

| Tool | Description |
|------|-------------|
| `parse_document` | HWP/HWPX/PDF/XLSX/DOCX → Markdown (with metadata) |
| `detect_format` | format detection via magic bytes |
| `parse_metadata` | fast metadata only |
| `parse_pages` | a page range only |
| `parse_table` | the Nth table only |
| `parse_chunks` | RAG structure chunks — heading/outline breadcrumbs + standalone table chunks |
| `compare_documents` | compare two documents (cross-format) |
| `parse_form` | form fields as JSON |
| `fill_form` | fill a form (HWPX format-preserving, format/uniqueness guards, built-in `template`) |
| `patch_document` | apply edited Markdown back into the original HWPX/HWP, format preserved |
| `extract_profile` | table format profile JSON from a reference HWPX — reuse via `generate_document`'s `profile_path` |
| `generate_document` | Markdown (tables/equations/charts) → HWPX, official-document presets |
| `place_seal` | float a stamp/signature image over an anchor phrase |
| `render_document` | render HWPX/HWP as typeset to PNG/JPEG (inline) or SVG/HTML/PDF files — lets the AI visually check generated/edited output |
| `redact_document` | PII detection + format-preserving masking (HWPX/HWP incl. headers, footnotes, previews and document info, with a re-scan; other formats: masked Markdown) |
| `crop_regions` | crop rendered regions (tables/images/paragraphs/shapes) from page images at true scale + regions.json |
| `extract_tables` | table classification (data / org-chart-like / uncertain) + page·bbox + policy-based crops — org charts as images, data tables as structure |

---

## 📚 API

### Parsing

| Function | Description |
|----------|-------------|
| `parse(buffer, options?)` | auto format detection → Markdown + `IRBlock[]` (a file path string works too) |
| `parseHwpx` · `parseHwp` · `parseHwp3` · `parseHwpml` | HWPX · HWP 5.x · HWP 3.x (1996–2002) · HWPML only — all `(buffer, options?)` |
| `parsePdf` · `parseDocx` · `parseXlsx` · `parseXls` | PDF · DOCX · XLSX · XLS (Excel 97–2003, BIFF8) only |
| `parseImage(buffer, options?)` | images (PNG/JPG/WebP) only — built-in OCR always on |
| `detectFormat(buffer)` | synchronous magic-byte detection — returns `hwpx` for ZIP and `hwp` for OLE2 for backward compatibility |
| `await detectZipFormat(buffer)` | ZIP entries → `hwpx` · `xlsx` · `docx` · `pptx` · `unknown` |
| `detectOle2Format(buffer)` | OLE2 streams → `hwp` · `xls` · `unknown` |

PPTX is detected only — `parse()` returns `success: false` · `fileType: "pptx"` · `code: "UNSUPPORTED_FORMAT"`. To route ZIP formats, call `await detectZipFormat(buffer)` when `detectFormat()` returns `hwpx`.

### Compare · forms · editing

| Function | Description |
|----------|-------------|
| `compare(bufferA, bufferB, options?)` | IR-level document comparison |
| `extractFormFields(blocks)` / `extractFormSchema(blocks)` | form field recognition / + type, required, empty inference |
| `fillForm(input, values, outputFormat?)` | fill a form — `"markdown"` (default) · `"hwpx"` · `"hwpx-preserve"`, returns `{ output, format, fill }` |
| `fillFormFields(blocks, values)` | replace field values on IRBlock[] |
| `fillHwpx(buffer, values)` | direct HWPX XML manipulation (format-preserving) |
| `extractClickHereFields(buffer)` | inspect HWPX click-here (CLICK_HERE) fields — names and guide text |
| `resolveBuiltinTemplate(name)` / `readBuiltinTemplate(t)` | look up / load built-in draft templates (`gian` · `gian-simple`) |
| `patchHwpx(original, editedMarkdown, options?)` | edited Markdown → format-preserving HWPX patch |
| `patchHwp(original, editedMarkdown, options?)` | edited Markdown → format-preserving HWP 5.x binary patch |
| `openHwpxDocument(bytes, options?)` | `HwpxSession` incremental block-patch session for editors |
| `patchHwpxBlocks(bytes, edits, options?)` | one-shot block edits without a session |
| `placeSealHwpx(buffer, seals)` | float stamp/signature images over anchor phrases |
| `validateHwpx(buffer)` | HWPX structure validation — ZIP, mimetype, required parts, XML well-formedness |

### Generate · render

| Function | Description |
|----------|-------------|
| `markdownToHwpx(markdown, options?)` | Markdown → HWPX (theme, format profile, page options, official-document presets) |
| `hwpxToProfile(buffer)` | reference HWPX → table format profile JSON (reuse via `markdownToHwpx(md, { profile })`) |
| `markdownToPdf(markdown, options?)` / `blocksToPdf(blocks, options?)` | Markdown / IRBlock[] → PDF (install `puppeteer-core` separately) |
| `renderHtml(blocks, options?)` | IRBlock[] → print-ready HTML (no puppeteer; raw HTML passes only allowed tags, plus CSP) |
| `renderHwpxToSvg(buffer, options?)` | HWPX → layout-preserving SVG — multi-page, highlights, shapes; `reflow` when cache-less |
| `renderDocument(input, { format, pages?, … })` | HWPX / HWP (5.x) → per-page svg/png/jpeg or document html/pdf assets + `RenderScene` (page-local pt bboxes, deterministic region ids) |
| `extractRenderedRegions(input, { types?, pages?, … })` | crop table/image/paragraph/shape regions from page images at true scale |
| `extractTables(input, { policy?, … })` | table classification (data / org-chart-like / uncertain) + render-region join + policy-based crops |

### Text · conversion helpers

| Function | Description |
|----------|-------------|
| `lintGongmunText(text, { document? })` | 19 official-notation rules + 2 AI-slop rules (`document: true` adds document-level attachment / "끝." checks) |
| `redactMarkdown(text, options?)` / `redactText(...)` | PII detection + masking — text level (file level: CLI `redact`, MCP `redact_document`) |
| `blocksToChunks(blocks, options?)` | RAG structure chunks — heading/outline breadcrumbs + standalone table chunks |
| `blocksToMarkdown(blocks)` | IRBlock[] → Markdown |
| `blocksToPages(blocks)` | IRBlock[] → `[{ pageNumber, markdown }]` |

### Types

```typescript
import type {
  ParseResult, ParseSuccess, ParseFailure, FileType,
  IRBlock, IRBlockType, IRTable, IRCell, CellContext,
  DocumentMetadata, ParseOptions, ErrorCode, OutlineItem,
  DiffResult, BlockDiff, CellDiff, DiffChangeType,
  FormField, FormResult, FormFieldType, FormFieldSchema, FormSchemaResult,
  FillResult, HwpxFillResult, FillOutputFormat, FillFormOutput,
  ClickHereField, BuiltinTemplate,
  PatchOptions, PatchResult, PatchSkip,
  HwpxTheme, MarkdownToHwpxOptions, PageOptions,
  PrintPreset, PrintOptions, PageMargin,
  RenderSvgOptions, RenderSvgResult,
  SealOp, SealPlacement, PlaceSealResult,
  ValidateResult, ValidateIssue,
  RedactRule, RedactOptions, RedactHit, RedactTextResult,
  DocChunk, ChunkOptions, GongmunLintFinding,
  OcrProvider, WatchOptions,
} from "kordoc"
```

---

## 📂 Supported Formats

| Format | Engine | Highlights |
|--------|--------|-----------|
| **HWPX** (Hancom 2020+) | ZIP + XML DOM | manifest, nested tables, merged cells, corrupted-ZIP recovery, real page boundaries from the typesetting cache, open passwords, form check boxes and radio buttons |
| **HWP 5.x** (Hancom legacy) | OLE2 + CFB | distribution-copy decryption, open passwords, corrupted-CFB recovery, footnotes/hyperlinks, 21 control chars, image extraction, real page boundaries |
| **HWP 3.x** (1996–2002) | single binary | Johab → Unicode, 5,893 Hanja/symbol lookup, nested paragraphs, arae-a (archaic Hangul), open passwords |
| **HWPML 2.x** (XML-based HWP) | XML DOM | HeadingType-based headings, merged cells, DoS guards |
| **PDF** | pdfjs-dist | ruled, clip-based and borderless tables, XY-Cut reading order, two-column pages, headings, footnotes/endnotes, math-font recovery, OCR, underline/links, image extraction, text-quality signals |
| **XLSX** (Excel) | ZIP + XML DOM | shared strings, merged cells, multiple sheets, formula display, date cells to ISO, large-sheet streaming |
| **XLS** (Excel 97–2003) | OLE2 + BIFF8 | Workbook stream, SST shared strings, cell/sheet extraction |
| **DOCX** (Word) | ZIP + XML DOM | style-based headings, numbering (real number labels), footnotes, hyperlinks, image extraction |
| **Images** (PNG/JPG/WebP) | sharp + built-in OCR | screenshots and scans as direct input, tables recovered from raster rules |

---

## 🔒 Security

- Production-grade hardening: ZIP-bomb and decompression-bomb guards, XXE/Billion-Laughs prevention, path-traversal blocking, MCP error sanitization and output-path re-checks (`O_NOFOLLOW`), watch-webhook SSRF and DNS-rebinding blocking, 500MB file-size cap, JavaScript and external requests blocked in print/render PDFs. See [SECURITY.md](./SECURITY.md).
- **Air-gapped (internal network) deployment** — `KORDOC_OFFLINE=1` blocks all outbound traffic (OCR model downloads, watch webhooks) before any request, and `KORDOC_ROOT=<dir>` confines MCP file reads/writes to that directory (both opt-in). Build an offline bundle with `node scripts/pack-offline.mjs [--with-ocr] [--with-models]` and move OCR models with `kordoc models --export/--import` (SHA-256 verified). Procedure and security-review evidence: [docs/offline-deployment.md](docs/offline-deployment.md).

---

## 📝 Recent Changes

### v4.16.0
- **PDF text & tables**: against the original HWPX/DOCX, char recall 99.8% · precision 99.6% · reading order 99.1% · word F1 98.8%; tables match cell for cell 97.0%.
- **PDF recovery**: page-bottom footnotes and document-end endnotes move next to their references; TOC leader dots, book-edge index tabs, underlined form blanks, Chinese/Japanese line wraps, press-release contact tables.
- **Automatic OCR**: pages without a text layer (scans, glyphs drawn as curves) are OCR'd automatically when the OCR model is cached — ODL 200 default 0.940 (`ocr: false` turns it off).
- **DOCX**: numbered lists carry their real labels ("[3]", "5.1", "A.1") instead of "1.".
- **CLI image path change** (#98): images go to a per-document `images/<document name>/` — converting several documents into one folder no longer overwrites them.
- `render --reflow` compatibility (#97) · install guidance for network-restricted linux/x64 (#99) · webhook / MCP output / HTML rendering hardening (#100).

### v4.15.7
- **Nested tables**: HWP5 tables come out the same shape as the same document's HWPX (only page-spanning body boxes flattened); 3- to 8-level nested tables keep every level in HWPX, HWP5 and PDF. HWP/HWPX → Markdown tables (single-column excluded) match 3,111/3,111 (HWP) and 9,122/9,123 (HWPX).
- **PDF**: occluded text removal, vertical text boxes, letter-spaced Latin, TeX math-font symbols, chapter-number headings, per-line number lists in cells — ODL default 0.937, `ocr: true` 0.960.
- **New options**: `plain` (text-first) and `htmlTables` (every table as indented HTML) — 0.949 without OCR, 0.971 with OCR.
- Issues #91–#95: sparse XLSX, click-here guide text, encrypted HWPX hang on Windows, `-o` image links, non-ASCII `generate --image-dir` names.

### v4.15.6
- **PDF structure**: ODL 200 overall 0.9055 → 0.9345 (reading order 0.938 · tables 0.931 · headings 0.926) — Word/slide tables (shaded cells, transparent text boxes, multi-line headers with only top/bottom rules), small-caps and old-style digit glyphs, vertical stamps in margins, sidebar subheadings, wrapped English and split links in cells.
- `ocr: true` reads text inside charts and logos region by region (0.952); the default path warns about pages that need OCR.

### v4.15.5
- **PDF tables & two-column pages**: header/total rows drawn only with vertical rules, tables whose header row alone is a shaded box, and journal tables with horizontal rules only are recovered as one table. On two-column pages, figure captions come first and footnotes after the body — ODL 200 0.775 → 0.906.
- Two kinds of false PDF headings (#89); missing input files fail with `FILE_NOT_FOUND` (#88).

### v4.15.4 · v4.15.3 · v4.15.2
- **v4.15.4**: dense Korean PDF table rows and clip boundaries (exact tables 2,512 → 2,526/2,692); ODL 200 headings and aligned numeric tables (0.725 → 0.775).
- **v4.15.3**: page-spanning nested tables whose header row split from the next page's body because of the wrapper are rejoined (nested tables 157 → 158/176); faster clip grouping on clip-heavy pages.
- **v4.15.2**: fewer narrow visual gaps turned into empty PDF table rows/columns (real empty columns repeated across rows are kept); less memory at dense rule intersections.

### v4.15.1
- **PDF stability & speed**: memory blow-up on very long rules fixed, resources released after each page, better repeated-image handling, reusable input ArrayBuffer, warning when the page cap truncates a range.
- **PDF text & tables**: translated/rotated pages and Form XObject coordinates, narrow empty columns, page-spanning nested tables and remarks, notes/sources under tables no longer removed as footers, per-page Markdown.
- **OCR**: JPEG EXIF orientation, large images downscaled to 24MP max, up to 3,000 detection boxes (warning beyond), fewer repeated rule-detection passes.
- **Name masking** (opt-in): more names detected in transcripts and minutes (external ground truth 361/411, 0 false positives).

### v4.15.0
- **Long spreadsheets**: silent 10,000-row truncation in XLSX/XLS fixed (a warning when the cell budget is exceeded); less memory via chunked XLSX row reading and sparse XLS grids; East Asian dates, DOCX headers/footers.
- **PDF text**: justified spacing no longer glues real words; table-cell glyph fragments, date blanks, wide-leading paragraph joins.
- **Security**: HTML table cell text escaped; JavaScript off and non-`data:`/`about:` requests blocked in print/render PDFs; webhook IPv6 SSRF and MCP write-path limits.
- **Stability**: CLI/MCP/parse-worker diagnostics to stderr (JSON output protected), lossless patching of documents whose extension differs from the real format, faster compare and multi-range replacement.
- **Masking** (opt-in): speakers in minutes, names before agency titles, approval boxes, road-name variants.
- **`watch -d`**: keeps subfolder structure ([PR #82](https://github.com/chrisryugj/kordoc/pull/82), @ROTl24).
- **Verification corpus**: 300 policy-briefing HWPX↔PDF pairs, 36 DOCX↔LibreOffice PDF pairs, an XLS ground-truth track.

The full history of earlier versions is in the **[CHANGELOG](CHANGELOG.md)** (Korean).

---

## About the Author

A local civil servant in Korea. Built this after seven years of wrestling HWP files at the Gwangjin-gu District Office in Seoul. Validated on thousands of real government documents across five public-sector projects.

## License

[MIT](./LICENSE). This project includes the following open-source software:

- **rhwp** (MIT, edwardkim) — HWP5 distribution-copy decryption and lenient CFB parsing algorithms, the draft templates in `templates/`
- **claw-hwp** (MIT, DoHyun468) — OOXML chartSpace assembly, floating stamp placement metrics, secure-fill format engine, validate check set
- **OpenDataLoader PDF** (Apache 2.0, Hancom Inc.) — PDF table detection algorithm
- **hml-equation-parser** (Apache 2.0, Open Bapul) — HML equation parsing
- **PaddleOCR** (Apache 2.0, PaddlePaddle) — derived text OCR engine (PP-OCRv5 korean)
- **Pix2Text** (MIT, breezedeus) — formula OCR (MFD/MFR) algorithm port. Models are downloaded at runtime and not redistributed — the MFD weights are based on Ultralytics YOLOv8 (AGPL-3.0), so commercial or closed products relying on formula OCR should check those terms separately
- **cfb** (Apache 2.0, SheetJS) — HWP5 OLE2 container parsing
- **pdfjs-dist** (Apache 2.0, Mozilla) — PDF text extraction
- **JSZip** (MIT, Stuart Knightley et al.) — ZIP-based format parsing

Full notices are in [NOTICE](./NOTICE) and license texts in `THIRD_PARTY/` — both ship in the npm package.
