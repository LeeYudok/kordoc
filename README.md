# kordoc

**모두 파싱해버리겠다.**

[![npm version](https://img.shields.io/npm/v/kordoc.svg)](https://www.npmjs.com/package/kordoc)
[![license](https://img.shields.io/npm/l/kordoc.svg)](https://github.com/chrisryugj/kordoc/blob/main/LICENSE)

> *대한민국에서 둘째가라면 서러울 문서지옥. 거기서 7년 버틴 공무원이 만들었습니다.*

HWP 3.x/5.x, HWPX, HWPML, PDF, XLS, XLSX, DOCX, 이미지(PNG/JPG/WebP) — 관공서에서 쏟아지는 모든 문서를 파싱하고, 비교하고, 분석하고, 생성합니다. [English](./README-EN.md)

> 📊 **PDF 공개 벤치(opendataloader-bench 200문서) 종합 0.940 — 공개된 12개 PDF 파서(상용 포함) 모두보다 높고 쪽당 0.05초**(OCR 0.960 · OCR+plain 0.967). 한국 공문서는 원본 HWPX를 정답으로 채점해 HWPX 표 13,041개 전부 칸까지 일치합니다. → [성능](#-성능)

[![Kordoc 활용하기 — 영상 보기](./docs/video-demo.jpg)](https://youtu.be/Q13GmgDcIw0)

<sub>▶ 클릭하면 유튜브에서 재생됩니다.</sub>

**목차** — [설치](#-설치) · [주요 기능](#-주요-기능) · [성능](#-성능) · [빠른 시작](#-빠른-시작) · [CLI](#-cli) · [MCP 서버](#-mcp-서버) · [API](#-api) · [지원 포맷](#-지원-포맷) · [보안](#-보안) · [최근 변경](#-최근-변경)

---

## ⚡ 설치

Node.js 20+ 만 있으면 됩니다 (macOS / Linux / Windows).

### AI 에이전트 연동 (MCP) — 30초

```bash
npx -y kordoc setup
```

대화형 마법사가 AI 클라이언트(Claude Desktop · Cursor · Claude Code · Windsurf · VS Code · Gemini CLI · Zed · Antigravity · Codex — 설치된 건 `[감지됨]` 표시)를 골라 설정 파일을 자동 패치합니다. Windows 는 `cmd /c npx` 래핑까지 자동이고, Codex 는 설정 파일 대신 `codex mcp add` 로 등록합니다. 클라이언트를 재시작하면 [17개 문서 도구](#-mcp-서버)가 켜집니다.

### Claude Code 플러그인

MCP 대신 스킬(SKILL.md)로 쓰려면:

```
/plugin marketplace add chrisryugj/kordoc
/plugin install kordoc@kordoc
```

`.hwp`/`.hwpx` 언급이나 공문서 생성·서식 채우기 요청에 kordoc 스킬이 자동으로 켜집니다(내부에서 `npx -y kordoc@^4` CLI 호출 — 별도 설치 불필요).

### 라이브러리 · CLI

```bash
npm install kordoc        # CLI 만 쓸 거면 설치 없이 npx kordoc <파일>
```

- PDF 파싱(pdfjs-dist)·OCR(onnxruntime·sharp·pdfium) 같은 선택 의존성은 **기본 설치**됩니다. 용량을 줄이려면 `--omit=optional` — 이때 PDF 파싱·OCR·PNG 래스터 등 일부 기능이 빠집니다.
- `markdownToPdf`/`blocksToPdf`(인쇄 렌더)만 선택적 peer 의존성 `puppeteer-core` 를 씁니다 — 필요하면 `npm install puppeteer-core`.

<details>
<summary>설치 문제 해결</summary>

- **`MODULE_NOT_FOUND` / `Cannot find module ...\dist\cli.js`** — 과거에 깨진 글로벌 설치가 남은 상태입니다.
  ```powershell
  npm uninstall -g kordoc
  npx -y kordoc@latest setup
  ```
- **Windows PowerShell `npx.ps1 파일을 로드할 수 없습니다 · PSSecurityException`** — 서명 없는 `.ps1` 을 막는 PowerShell 기본 정책입니다(kordoc 무관). ① 명령 프롬프트(cmd)에서 `npx -y kordoc setup` 실행(가장 안전), 또는 ② 관리자 PowerShell 에서 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 후 PowerShell 재시작.
- **네트워크가 제한된 linux/x64 에서 PNG 렌더·이미지 OCR 만 `MISSING_DEPENDENCY`(sharp)로 실패** (#99) — 선택 의존 `onnxruntime-node` 설치 스크립트가 CUDA 바이너리를 `api.nuget.org` 에서 받다 실패하면 npm 이 `sharp`·`@huggingface/transformers` 까지 뺍니다(kordoc 은 CPU 추론만 씀). npx 캐시 실행은 `npm install sharp` 로 고쳐지지 않으니 CUDA 다운로드를 건너뛰고 설치하세요.
  ```bash
  ONNXRUNTIME_NODE_INSTALL=skip npx -y kordoc@^4 <command> ...
  ```
- **폐쇄망** — [보안 · 폐쇄망](#-보안) 참고.

</details>

---

## 💡 주요 기능

| 기능 | 내용 |
| --- | --- |
| 📄 **문서 → Markdown** | HWP3·HWP5·HWPX·HWPML·PDF·XLS·XLSX·DOCX 와 PNG/JPG/WebP 이미지(자동 OCR)를 LLM 이 읽기 좋은 Markdown + 구조 IR(`IRBlock[]`)로 |
| 📊 **표 복원** | 병합·중첩 표를 구조 그대로. HWPX 2,286문서 표 13,041개 칸까지 무손실(독립 추출기 대조), 같은 문서의 PDF 는 원본 HWPX 대조(708쌍 2,632표) 표 찾기 99.5%·칸까지 완전 일치 96.7%. 선 없는 PDF 표·법령 개정안 신구조문대비표까지 |
| 🔍 **신구대조표** | 두 문서 차이를 블록·셀 단위로 (HWP ↔ HWPX 교차 비교 가능) |
| 📝 **Markdown → HWPX** | AI 가 쓴 글을 보고서 양식 HWPX 로 되돌림 — 표·수식(`<hp:equation>`)·차트 포함 |
| 🏛️ **정부 표준 공문서 생성** | 실제 정부 양식 16종 + 실결재 기안문 60건을 대조해 만든 엔진. 개조식 보고서(표지·목차 배너·로마숫자 장헤더·쪽번호·결재란), 기안문(별지 제1호서식 두문·결문, "끝." 자동), 공고문·보도자료 프리셋, 항목부호 8단계(1. 가. 1) 가)…), 공문서 표기법 검수 19룰(`kordoc lint`) — 한글 COM 실렌더로 조판 검증 |
| 🔄 **서식 보존 라운드트립** | 변환한 Markdown 을 고쳐 `patchHwpx`/`patchHwp` 에 넘기면 원본 서식은 1바이트도 안 건드리고 바뀐 문단·셀 글만 교체. 표 행 추가·삭제, HWP5 빈 칸 채우기 포함 |
| ✏️ **양식 채우기** | 신청서·보고서 양식 빈칸 채우기(글꼴·크기·정렬 보존). 누름틀 이름 정확 매칭, 내장 표준 기안문 서식 2종 |
| 🔴 **도장·서명 날인** | "(인)"·"서명 또는 인" 앵커를 찾아 도장 PNG 를 글 앞 부유로 — 표·쪽을 키우지 않음 (`kordoc seal`) |
| 🖼️ **레이아웃 보존 렌더** | 한컴 조판 캐시로 원본 모양 SVG/PNG/PDF, 캐시 없는 생성본은 순수 TS reflow 조판 — 다페이지·표·도형·형광펜. 서버에 한컴 없이 미리보기 |
| 📈 **차트 생성** | Markdown ```` ```chart ```` 펜스(type/cat/계열 줄) → 한컴 네이티브 차트(OOXML chartSpace) — 막대·선·원·도넛·영역·분산·방사형 등 20종, 계열·조각 색 지정 |
| 👓 **내장 OCR** | 스캔 PDF·이미지를 로컬 CPU(PP-OCRv5 korean)로 — API 키 없이, 필요한 쪽만, 래스터 괘선으로 표까지 |
| 📑 **RAG · 인용** | 헤딩·개조식 위계 breadcrumb 구조 청크(`--format chunks`), 조판 캐시 기준 **실제 쪽 번호** 쪽별 Markdown(`pages`) — 답변에 "몇 쪽" 인용 |
| 🕶️ **개인정보 마스킹** | 주민·외국인등록번호·전화·이메일·카드·계좌·사업자등록번호·여권·운전면허(opt-in 이름·주소·법인등록번호·IP)를 탐지해 HWPX/HWP 는 서식 그대로 가림 — 본문·표·머리말/꼬리말·각주·글상자·필드·미리보기·문서 정보까지, 남으면 exit 2. PDF·DOCX·XLSX 등은 원본을 고치지 않고 마스킹된 Markdown 만(PDF 가림 미지원). 이미지 속 글자·문맥 없는 맨이름은 못 잡으니 공개 전 사람 확인 필수 |
| 🤖 **AI 에이전트 (MCP)** | Claude Desktop · Cursor · Codex 등에서 문서 도구로 직접 호출 |

---

## 📊 성능

모든 수치는 `npm run bench:gate` 로 재현되며, `npm publish` 때마다 이 게이트를 통과해야 배포됩니다.

### PDF → Markdown — 공개 벤치 12개 엔진보다 높음

[opendataloader-bench](https://github.com/opendataloader-project/opendataloader-bench): PDF 200쪽(논문·보고서·슬라이드·포스터·스캔)을 사람이 만든 정답과 비교해 **읽기 순서(NID)·표 구조(TEDS)·제목 위계(MHS)** 를 잽니다(1.0 = 정답과 같음).

| 순위 | 엔진 | 종합 | 읽기 순서 | 표 | 제목 | 쪽당 시간 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| **1** | **kordoc 기본값** (OCR 모델 캐시 있음) | **0.940** | **0.943** | **0.936** | **0.935** | **0.05초** |
| 참고 | kordoc 기본값 (OCR 모델 없음) | 0.937 | 0.938 | 0.936 | 0.933 | 0.04초 |
| 참고 | kordoc `plain: true` | 0.946 | 0.947 | 0.937 | 0.940 | 0.03초 |
| 참고 | kordoc `plain: true, htmlTables: true` | 0.949 | 0.954 | 0.940 | 0.943 | 0.03초 |
| 참고 | kordoc `ocr: true` | 0.960 | 0.960 | 0.979 | 0.949 | 0.46초 |
| 참고 | kordoc `ocr: true, plain: true` | 0.967 | 0.968 | 0.981 | 0.956 | 0.46초 |
| 참고 | kordoc `ocr: true, plain: true, htmlTables: true` | 0.973 | 0.977 | 0.983 | 0.959 | 0.46초 |
| 2 | opendataloader-hybrid | 0.907 | 0.934 | 0.928 | 0.821 | 0.46초 |
| 3 | nutrient (상용) | 0.885 | 0.925 | 0.708 | 0.819 | 0.01초 |
| 4 | docling | 0.882 | 0.898 | 0.887 | 0.824 | 0.76초 |
| 5 | marker | 0.861 | 0.890 | 0.808 | 0.796 | 53.9초 |
| 6 | unstructured-hires | 0.841 | 0.904 | 0.588 | 0.749 | 3.01초 |
| 7 | edgeparse | 0.837 | 0.894 | 0.717 | 0.706 | 0.04초 |
| 8 | mineru | 0.831 | 0.857 | 0.873 | 0.743 | 5.96초 |
| 9 | opendataloader | 0.831 | 0.902 | 0.489 | 0.739 | 0.02초 |
| 10 | pymupdf4llm | 0.732 | 0.885 | 0.401 | 0.412 | 0.09초 |
| 11 | unstructured | 0.686 | 0.882 | 0.000 | 0.388 | 0.08초 |
| 12 | markitdown | 0.589 | 0.844 | 0.273 | 0.000 | 0.11초 |
| 13 | liteparse | 0.576 | 0.866 | 0.000 | 0.000 | 1.06초 |

- 기본값만으로 **종합·읽기 순서·표·제목 모두 1위** — GPU·클라우드 API·LLM 없이 Node.js 하나로.
- **OCR**: 기본값은 OCR 모델이 이미 캐시에 있으면(`kordoc models`·앞선 `ocr: true` 로 받은 경우) **텍스트층 없는 쪽(스캔·곡선 글자)만** 자동으로 읽고, 모델이 없으면 다운로드 없이 `NEEDS_OCR` 경고. 글 있는 쪽 안의 그림 속 글은 `SKIPPED_IMAGE` 경고로 알리고 `ocr: true` 가 읽습니다(차트·로고·스캔까지 → 0.960). `ocr: false` 는 자동 OCR 도 끕니다.
- **`plain: true`**: 그림 자리 표시·링크 URL·밑줄/굵게 표기를 빼 색인·RAG 용 글만(정답지에 이런 표기가 없어 점수도 오름). **`htmlTables: true`**: 모든 표를 들여쓴 HTML 로.
- **재현**: 다른 엔진 점수는 벤치 저장소 공개 결과(Apple M4 32GB), kordoc 은 같은 PDF·정답·**수정하지 않은 원본 채점기**(Apple M4 24GB, 200문서 한 프로세스 순차). 벤치의 opendataloader-hybrid 예측을 같은 채점기로 다시 재면 0.9066 으로 공개 점수와 같습니다. `node bench/odl-bench.mjs <벤치 클론>` → 벤치의 `src/evaluator.py`.
- 벤치에 결과만 PR 로 올라온 상용 LM-Kit One(미병합 #34)은 OCR 없이 0.948·OCR 0.963. 격차 대부분은 표 칸을 정답지와 같은 HTML 모양(`<td> 글 </td>`, 머리행도 `<td>`)으로 내는 차이로, 같은 서식으로 맞추면 kordoc `plain` 0.951·LM-Kit 0.948, `htmlTables` 까지 켜면 kordoc OCR 없이 0.949·OCR 0.973 로 둘 다 앞섭니다.

### 한국 공문서 — 원본 HWPX 를 정답으로

HWPX 원본과 그 문서를 PDF 로 내보낸 파일이 짝으로 있는 실제 정부 문서(보도자료·결재문서·법령 서식·예산서 등)로, 원본을 정답 삼아 PDF 에서 뽑은 글과 표를 잽니다.

| 분야 | 규모 | 결과 |
| --- | --- | --- |
| HWPX 본문·표 | 2,286문서, 표 13,041개 | 글 누락 0 · 표 전부 칸까지 일치 · 읽기 순서 100% |
| HWP 5.x | HWPX 와 짝 1,120쌍 | HWPX 결과와 전부 일치 |
| PDF 글 | 744쌍 (HWPX·DOCX 정답) | 글자 재현율 99.8% · 정확도 99.6% · 읽기 순서 99.1% · 어절 F1 98.8% |
| PDF 표 | 708쌍, 표 2,632개 | 표 찾기 99.5% · 칸까지 완전 일치 97.0% · 칸 F1 0.984 |
| PDF 전체 | 1,911문서 (텍스트층 채점 1,724) | 글 커버리지 99.8% |
| 스캔 OCR (내장, 로컬 CPU) | 53문서 102쪽 (216dpi 렌더) | 글자 재현율 99.0% · 한글 재현율 99.4% · 정확도 99.4% · 쪽당 약 1초 |
| DOCX·XLSX·XLS·HML | 88문서 | 글·숫자 누락 0 |
| Markdown → HWPX → Markdown 왕복 | 83건 | 글·표·제목·수식 손실 0 |

> **채점 기준** (2026-09-29 정비, 상세는 [CHANGELOG](CHANGELOG.md)) — PDF 글 읽기 순서는 같은 글이 여러 번 나오는 줄은 순서가 맞는 등장 자리로 보고, 떠 있는 글상자·글자·숫자 없는 줄(마스킹 "*****")은 순서 채점에서만 뺍니다. 양쪽 평문에서 목록 표지 "- "·각주 감싸개 "(주: …)" 괄호를 걷습니다. PDF 글·표 모수에서는 원본과 다른 판(PDF 글이 3배 초과)과 PDF 텍스트층(pdftotext)이 정답 글자의 93% 를 못 담은 쌍(렌더 결함 재현본 등)을 뺍니다. PDF 커버리지는 리더 점 런을 지웁니다. OCR 은 표본 쪽을 고정(`bench/ocr-pages.json`)하고, 텍스트층 글이 없는 그림 영역의 OCR 글(본문 블록에 섞인 로고 글은 그림만 따로 읽어 설명되는 잉여만)과 그려지지 않은 텍스트층 글(흰 글·덮인 글)은 글자 대조에서 빼며, 글줄 안 글자를 그림으로 찍은 쪽은 표본에서 뺍니다. 픽셀로 못 가르는 글자(가운뎃점 · • ∙, 단위 ㎡ 와 m², 낫표 ｢｣ 「」)는 접고, 값 칸이 여러 줄로 나란히 쌓인 표 행은 줄 번호별로 펼칩니다.

### HWP·HWPX → Markdown — HwpForge 와 같은 채점기로

같은 코퍼스를 [HwpForge](https://github.com/ai-screams/HwpForge) 0.16.6(`to_md`, lossy)과 kordoc 으로 변환해 **원본 HWPX XML 을 정답**으로 같은 채점기에 넣었습니다(표는 두 출력 모두 같은 Markdown 표 파서로 격자화, 1열 표 제외).

| | kordoc | HwpForge 0.16.6 |
| --- | ---: | ---: |
| HWPX 2,305문서 — 변환 실패 | **0** | 123 |
| HWPX — 글 재현율 (변환 성공 문서만) | **100.00%** (100.00%) | 59.23% (98.64%) |
| HWPX — 표 완전 일치 (9,123표) | **100.0%** (9,122) | 32.2% |
| HWPX — 칸 F1 | **1.000** | 0.428 |
| HWP 5.x 1,108문서 — 변환 실패 | **0** | 19 |
| HWP — 글 재현율 | **100.00%** | 86.41% |
| HWP — 표 완전 일치 (3,111표) | **100%** | 27.0% |
| HWP — 칸 F1 | **1.000** | 0.349 |

- HwpForge 는 생성·편집 중심이고 Markdown 표가 파이프 표뿐이라 병합 칸을 못 나타내는 것이 표 점수 차이의 대부분입니다.
- 1열 표(1,288개)는 제목·본문 상자 43%·빈 여백 틀 28%·목록형 3% 인 꾸밈 틀이라 표/줄 글은 표현 선택이고 그 글은 글 재현율이 채점합니다. 1열 표를 넣으면 HWPX 10,392표 kordoc 90.6%·HwpForge 36.0%, HWP 3,500표 92.8%·32.1%.
- HWP 문서 수는 짝 HWPX 가 배포용 암호라 정답이 없는 1건을 뺀 값. 재현: `bench/hwpforge-bench.py` → `node bench/compare-md-parsers.mjs <출력 폴더>`(1열 표 포함은 `--include-single-col`).

---

## 🚀 빠른 시작

### 문서 파싱

```typescript
import { parse } from "kordoc"
import { readFileSync } from "fs"

const result = await parse(readFileSync("사업계획서.hwpx"))   // 파일 경로 문자열도 받음

if (result.success) {
  result.markdown   // 마크다운
  result.blocks     // IRBlock[] 구조화 데이터
  result.metadata   // { title, author, createdAt, pageMode, ... }
  result.pages      // [{ pageNumber, markdown }] 쪽 단위 본문
}
```

- `pages` 는 블록에 쪽 번호가 붙는 포맷(HWP·HWPX·PDF, XLS(X)는 시트 = 한 쪽)에서만 나옵니다. 쪽을 매기지 않는 DOCX 에서는 필드를 생략합니다.
- 쪽 경계 신뢰도는 `metadata.pageMode` — `"layout"`(조판 캐시 기반 실제 쪽) / `"section"`(섹션 근사).

**파싱 옵션** (`parse(buffer, options)` · CLI 플래그)

| 옵션 | CLI | 설명 |
| --- | --- | --- |
| `pages` | `-p, --pages` | `"1-3"`·`"1,3,5-7"`·`[1, 5, 10]` — PDF·한컴 저장본은 실제 쪽, 조판 캐시 없으면 섹션 근사 |
| `ocr` | `--ocr` · `--ocr-force` | 지정 안 함(기본): 모델 캐시가 있으면 텍스트층 없는 쪽만 자동 · `true`: OCR 필요 쪽 + 그림 속 글(모델 ~18MB 첫 사용 시 자동 다운로드) · `"force"`: 전 쪽 · `false`: 끔 · 함수: 외부 OCR 프로바이더 |
| `formulaOcr` | `--formula-ocr` | PDF 수식 OCR(MFD+MFR, 모델 ~155MB) — 감지한 수식을 `$…$`·`$$…$$` 로 |
| `images` | `--no-images` | `false` 면 이미지 바이트를 싣지 않음(그림 자리 표시는 남김, PDF 는 PNG 인코딩 생략) |
| `plain` | `--plain` | 그림 자리 표시·링크 URL·밑줄·굵게 없이 글 위주 Markdown(제목·목록·표 구조 유지, `blocks` 는 그대로) |
| `htmlTables` | `--html-tables` | 모든 표를 HTML 로, 태그마다 한 줄씩 들여써서(첫 행 `<th>`) |
| `password` | `--password` | 열기 암호 문서(HWPX·HWP3·HWP5, 한컴 DRM 은 해당 없음) |
| `tables` | `--no-tables` | `false` 면 PDF 표 감지 끔(테두리 상자가 표로 잡혀 순서가 뒤집히는 2단 시험지 등) |
| `removeHeaderFooter` | `--no-header-footer` | PDF 머리글/바닥글 제거(기본 켬, 3쪽 이상) |
| `keepTrailingEmptyCols` | `--keep-empty-cols` | 표 오른쪽 끝 빈 열(서식 입력란) 보존 |
| `keepEmptyParagraphs` | `--keep-empty-paragraphs` | 빈 문단 보존 — 원문 문단 수 = 줄 수(HWPX) |
| `includeFieldPlaceholders` | `--include-field-placeholders` | 미기입 누름틀 안내문도 출력(HWPX·HWP5) |
| `dedupeRunningHeaders` | `--dedupe-headers` | HWP5 레이아웃 표의 쪽마다 반복된 러닝 헤더 제거(붙임별 재번호도 지울 수 있어 opt-in) |
| `inlineImages` | `--inline-images` | 이미지를 base64 data URI 로 인라인(BMP→PNG, HWP5) |
| `classifyTables` | — | 표를 의미표/레이아웃/불확실로 분류해 `IRTable.classification` 에 |
| `onProgress` | — | 진행률 콜백 `(current, total)` |

### 문서 비교 (신구대조표)

```typescript
import { compare } from "kordoc"

const diff = await compare(구버전Buffer, 신버전Buffer)   // HWP ↔ HWPX 교차 비교 가능
// diff.stats → { added: 3, removed: 1, modified: 5, unchanged: 42 }
// diff.diffs → BlockDiff[] (표는 셀 단위 diff 포함)
```

### 양식 필드 추출 · 채우기

```typescript
import { parse, extractFormFields, fillForm } from "kordoc"
import { readFileSync, writeFileSync } from "fs"

const r = await parse(buffer)
if (r.success) {
  const form = extractFormFields(r.blocks)
  // form.fields → [{ label: "성명", value: "홍길동", row: 0, col: 0 }, ...], form.confidence → 0.85
}

// HWPX 원본 서식 보존 모드 — 글꼴·크기·정렬 유지
const filled = await fillForm(readFileSync("신청서.hwpx"), {
  성명: "홍길동", 주민등록번호: "900101-1234567", 주소: "서울특별시 광진구 능동로 120",
}, "hwpx-preserve")
writeFileSync("신청서_작성완료.hwpx", Buffer.from(filled.output as ArrayBuffer))
// filled.fill.filled → 채운 필드, filled.fill.unmatched → 매칭 실패한 키
```

### 내장 표준 기안문 서식 + 누름틀 채우기

「행정 효율과 협업 촉진에 관한 규정 시행규칙」 별지 서식 기반 표준 기안문 HWPX 가 패키지에 들어 있어, 파일 없이 이름만으로 실물 배치 품질의 공문서를 만듭니다(서식 자산: [rhwp](https://github.com/edwardkim/rhwp) tools/forms, MIT — `THIRD_PARTY/rhwp-forms.txt`).

| 이름 | 서식 | 용도 | 누름틀 |
|------|------|------|--------|
| `gian` (일반기안문) | 별지 제1호서식 | 대외 시행문·협조문 | 23곳 — 행정기관명·수신자·경유·제목·본문·붙임·발신명의·기안자·검토자·결재권자·시행번호 등 |
| `gian-simple` (간이기안문) | 별지 제2호서식 | 내부결재 보고서·계획서(결재란 표) | 13곳 — 생산등록번호·결재직위1~4·제목·요약설명·작성일 등 |

```bash
npx kordoc fill --list-templates                                # 내장 서식 목록 + 필드
npx kordoc fill --template gian -j 값.json -o 기안문.hwpx
npx kordoc fill templates:간이기안문 -f '제목=…' -o 보고.hwpx     # 위치 인자 표기도 같음
```

- 채우기 엔진은 **누름틀(CLICK_HERE 필드)을 이름으로 정확 매칭해 먼저 채우고** 남은 키는 라벨 매칭으로 — 누름틀이 있는 어떤 HWPX 서식(메일머지 양식 등)에도 동작합니다.
- `본문`처럼 `\n` 이 든 값은 문단 안 줄바꿈으로, 안내문과 같은 값을 채워도 유실되지 않으며, 원본 charPr(서식)은 그대로입니다.
- API: `extractClickHereFields(buf)`(필드 조사) · `readBuiltinTemplate(resolveBuiltinTemplate("gian")!)`(서식 로드) → `fillHwpx(buf, 값)`. MCP `fill_form` 도 `template` 파라미터로 같은 서식을 씁니다.

### HWPX 생성 (Markdown → HWPX)

```typescript
import { markdownToHwpx } from "kordoc"

const hwpx = await markdownToHwpx("# 제목\n\n본문\n\n| 이름 | 직급 |\n| --- | --- |\n| 홍길동 | 과장 |")

// display math → HWPX 네이티브 수식(<hp:equation>) — \frac·\sqrt·첨자·Greek·적분/극한·화살표·관계 연산자·matrix 의 LaTeX-like subset
await markdownToHwpx("피타고라스\n\n$$a^2 + b^2 = c^2$$")

// 공문서 모드 — 항목부호 8단계 + 내어쓰기 + 공식 여백/명조 자동
// preset: official | report | plan | notice | minutes | gaejosik | press | ministry(업무보고) | bangchim(서울방침)
await markdownToHwpx("1. 추진배경\n  - 세부 항목\n2. 추진계획", { gongmun: { preset: "보고서" } })

// 정부 표준 개조식 보고서 — 표지·목차(장식 배너)·로마숫자 장헤더·본문 제목박스·쪽번호("- 1 -", 표지·목차 제외)
await markdownToHwpx(md, {
  gongmun: {
    preset: "개조식",
    cover: { org: "기관명", date: "2026. 7. 11." },
    toc: true,                          // h2 목록 → Ⅰ Ⅱ Ⅲ 목차 (개조식 기본 켬)
    approval: ["담당", "팀장", "과장"],   // 결재란 (선택)
    pageNumbers: true,                  // 쪽번호 (개조식·보고서·계획서 기본 켬)
    endMark: false,                     // 본문 끝 "끝." (기안문 기본 켬)
  },
})
```

- 표는 실측 정부 문법을 자동 적용: 헤더 음영 + 굵게 + 하변 이중선, 외곽 0.4mm 위계, 라벨열 음영, 내용 비례 열폭(수치 열 실폭 고정), 본문폭보다 좁게 + 우측 배치.
- 테마(`HwpxTheme` — 헤딩·본문·인용·표 헤더 글자색/굵기), 참조 문서 표 서식 프로필(`hwpxToProfile` → `{ profile }`), 쪽 옵션을 받습니다.
- CLI: `kordoc generate 보고서.md -o 보고서.hwpx --preset 개조식 --org 기관명 --approval 담당,팀장,과장` (`--toc/--no-toc` `--cover/--no-cover` `--page-numbers` `--end-mark` `--no-body-title-box` `--fonts` `--sizes`).

### 레이아웃 보존 렌더

한컴이 HWPX 에 저장하는 조판 캐시(줄 좌표·셀 격자·개체 앵커)를 그대로 SVG 절대배치로 그립니다 — 조판 엔진 없이 빠르고 서버에 한컴이 없어도 됩니다. 다페이지 세로 스택·검색어 형광펜·그리기 도형 지원. 캐시가 없는 파일(`markdownToHwpx` 산출물·AI 생성본·편집본)은 **순수 TS reflow 엔진**이 조판합니다. 수식 개체는 미지원.

```typescript
import { renderHwpxToSvg, renderDocument, extractRenderedRegions } from "kordoc"

const r = await renderHwpxToSvg(readFileSync("결재문서.hwpx"), { highlights: ["예산"] })
// r.svg, r.width/r.height (pt), r.pageCount, r.stats { texts, images, tables }, r.warnings
const g = await renderHwpxToSvg(generatedHwpx, { reflow: true })   // 조판 캐시 없는 생성본

// 통합 렌더 — HWPX·HWP(5.x), 페이지별 PNG + 표 영역 crop
const { scene, assets } = await renderDocument("결재문서.hwp", { format: "png", pages: "1-2" })
const crops = await extractRenderedRegions("결재문서.hwp", { types: ["table"] })
```

CLI: `kordoc render 결재문서.hwpx -o 결재문서.svg` — 캐시 없는 문서는 기본으로 reflow 조판(`--no-reflow` 로 끔), `--highlight 예산,집행`, `--reflow-mode keep|charAll`. 연속 렌더는 `kordoc render-worker`(stdin NDJSON, 미리보기 앱 연동용).

### 대량 변환 — 상주 파싱 워커

```typescript
await parse(buffer, { images: false })                   // 이미지 바이트 없이
await parse(buffer, { plain: true, htmlTables: true })   // 글 위주 + 모든 표를 HTML 로
```

`kordoc parse-worker` 는 프로세스를 띄워 둔 채 stdin 한 줄(JSON) 요청마다 한 줄로 답합니다 — 파일마다 node 를 새로 띄우지 않습니다.

```text
시작  {"ready":true,"version":"4.16.0","protocol":1}
요청  {"id":1,"file":"문서.hwpx","images":false,"ocr":"off"}
응답  {"id":1,"rss":183500800,"result":{ …--format json 과 같은 결과, 실패도 success:false 로… }}
종료  {"cmd":"quit"}  (또는 stdin 닫기)
```

요청은 `ocr`(`"off"`·`"auto"`(필요 쪽만)·`"force"`), `formulaOcr`, `password` 를 받고, 응답의 `rss`(메모리)로 호스트가 워커 교체 시점을 정합니다.

### OCR (스캔·이미지 PDF)

```typescript
await parse(buffer, { ocr: true })      // OCR 필요 쪽 + 그림 속 글 (PP-OCRv5 korean, 첫 사용 시 모델 ~18MB 다운로드)
await parse(buffer, { ocr: "force" })   // 전 쪽 강제
await parse(buffer, {                   // 외부 OCR (Claude Vision, Tesseract 등)
  ocr: async (pageImage, pageNumber, mimeType) => myOcrService.recognize(pageImage),
})
```

- **API 키·외부 서비스 불필요** — det(선 검출) + rec(CTC 인식) ONNX 를 로컬 CPU 로 추론(PaddlePaddle 공식 변환본, Apache-2.0 / 한국어 사전 11,945자 — 완성형 한글 11,172자 전량 + 자모·라틴·기호).
- **쪽 단위 적용** — 텍스트층 없는 스캔 쪽·ToUnicode 가 깨진 쪽(`needsOcr`)만 OCR 하고 정상 쪽 결과는 그대로. 기본값(옵션 없음)의 자동 OCR 은 [파싱 옵션](#문서-파싱) 참고.
- **표 복원** — OCR 줄 좌표를 블록 파이프라인(XY-Cut 읽기 순서 + 클러스터 표 감지)에 태워 스캔본에서도 표 구조를 복원.
- 모델 관리: `kordoc models --status`(`--export`/`--import` 로 폐쇄망 사이드로드).

### PDF 텍스트 품질 신호

PDF 는 텍스트층이 있어도 ToUnicode/CMap 이 깨졌거나 제어문자가 섞이는 일이 많습니다. `parsePdf` 결과는 쪽별 품질 신호를 함께 줍니다.

```typescript
const r = await parsePdf(buffer)
if (r.success && r.qualitySummary?.needsOcr) await parse(buffer, { ocr: true })   // 또는 외부 OCR 큐로
for (const p of r.pageQuality ?? []) if (p.needsOcr) console.log(`p${p.page} 검토 필요: ${p.ocrReason}`)
```

신호 키: `textChars` · `hangulRatio` · `controlCharRatio` · `replacementCharRatio` · `puaRatio` / `needsOcr`(쪽·문서 단위) / `ocrReason` — `low_text` · `high_pua` · `high_control` · `high_replacement` · `garbled_hangul` · `vector_text`(글자를 곡선으로 그려 텍스트층에 글이 없는 쪽).

---

## 💻 CLI

```bash
# 변환
npx kordoc 사업계획서.hwpx                           # 터미널 출력
npx kordoc 보고서.hwp -o 보고서.md                   # 파일 저장 (그림은 images/보고서/)
npx kordoc *.pdf -d ./변환결과/                      # 일괄 변환
npx kordoc 검토서.hwpx --format json                # JSON (blocks + pages + metadata)
npx kordoc 검토서.pdf --format chunks               # RAG 구조 청크 JSON (breadcrumb + 표 독립 청크)
npx kordoc 보고서.hwpx --pages 1-3                   # 쪽 범위
npx kordoc 스캔본.pdf --ocr                          # 내장 OCR (--ocr-force 로 전 쪽)
npx kordoc 잠긴문서.hwpx --password '암호'            # 열기 암호 HWPX/HWP3/HWP5
npx kordoc 시험지.pdf --no-tables                    # PDF 표 감지 끄기
npx kordoc 문서.pdf --format json --no-images         # 이미지 없이 (--plain·--html-tables 도 있음)

# 양식 채우기
npx kordoc fill 신청서.hwpx -f '성명=홍길동,주소=서울' -o 결과.hwpx
npx kordoc fill 신청서.hwpx -j values.json -o 결과.hwpx
npx kordoc fill 신청서.hwpx --dry-run                              # 필드 목록만 (누름틀 포함)
npx kordoc fill 신청서.hwpx -j 값.json --formats '{"날짜":"yy.mm.dd"}' # 필드별 값 서식
npx kordoc fill 신청서.hwpx -j 값.json --require-unique            # 한 키가 2곳 이상 매칭되면 거부
npx kordoc fill 신청서.hwpx -j 값.json --mask                      # stdout 에 채운 값 대신 안내만
npx kordoc fill --template gian -j 값.json -o 기안문.hwpx           # 내장 표준 기안문 (--list-templates)

# 생성 · 편집 · 검증
npx kordoc generate 보고서.md -o 보고서.hwpx --preset 보고서        # Markdown → 공문서 HWPX
npx kordoc patch 원본.hwpx 편집.md -o 반영.hwpx                    # 서식 보존 패치 (.hwp 도 자동)
npx kordoc seal 신청서.hwpx --image 도장.png --anchor "(인)" -o 날인.hwpx
npx kordoc validate 산출물.hwpx                                    # HWPX 구조 검증 (ZIP·필수 파트·XML)
npx kordoc lint 보고서.md                                          # 공문서 표기법 19룰 (md/txt, '-'=stdin, error 면 exit 1)
npx kordoc profile 기관서식.hwpx                                   # 표 서식 프로필 JSON → generate --profile

# 개인정보 마스킹
npx kordoc redact 민원서류.hwpx -o 마스킹.hwpx                      # 서식 보존 마스킹 + 잔존 재검사 (남으면 exit 2)
npx kordoc redact 민원서류.hwpx --mask-char '*' -o 마스킹.hwpx      # 마스크 문자 (기본 ●)
npx kordoc redact 계약서.hwp --rules rrn,phone,crn --json --dry-run # 룰 선택 + 위치별 리포트만 (crn·IP 는 opt-in)
npx kordoc redact 민원서류.hwpx --rules rrn,phone,email,name,address -o 마스킹.hwpx  # 이름·주소까지 (opt-in)
npx kordoc redact 공문.pdf                                         # PDF·DOCX 등은 마스킹된 .redacted.md 만

# 렌더
npx kordoc render 결재문서.hwpx -o 미리보기.svg                     # 레이아웃 보존 SVG (캐시 없으면 reflow)
npx kordoc render 결재문서.hwpx --format png --pages 2-4 -d ./pages # PNG·JPEG·HTML·PDF 도
npx kordoc render 결재문서.hwpx --reflow-mode charAll -o 미리보기.svg # reflow 줄바꿈 keep(어절, 기본)|charAll(글자)

# 모델 · 감시
npx kordoc models --status                          # OCR 모델 상태 (--export/--import 폐쇄망 사이드로드)
npx kordoc check-ocr-models --status-only           # 상태만 JSON (옵션 빼면 없는 모델을 받음)
npx kordoc check-formula-models --status-only       # 수식 OCR 모델(MFD+MFR+tokenizer, ~155MB) 상태만
npx kordoc watch ./수신함 -d ./변환결과              # 폴더 감시 (하위 폴더 구조 유지)
npx kordoc watch ./문서 --webhook https://api/hook  # 웹훅 알림
```

- `watch -d` 는 하위 폴더 구조를 출력에도 둡니다: `수신함/팀/보고서.hwpx` → `변환결과/팀/보고서.md`.
- `check-ocr-models`·`check-formula-models` 는 이름과 달리 **없거나 SHA 가 안 맞으면 내려받습니다** — 상태만 보려면 `--status-only`.
- `kordoc lint` 는 **텍스트(Markdown/txt)** 를 검사합니다. HWPX 는 원고 Markdown 을 넘기거나 `kordoc 문서.hwpx | kordoc lint -` 로 파이프하세요. `generate` 도 같은 룰의 경고를 내고, `END_MARK_MISSING` 은 완성 원고를 보는 `lint` 에서만 켜집니다.

### 실패 계약 — 기계 판독 가능한 실패 JSON

변환 실패는 **모든 `--format`(markdown·json·chunks)** 에서 stdout 에 같은 실패 JSON 을 내고 exit 1 로 끝납니다 — stderr 문구 말고 `code` 로 분기하세요.

```json
{ "success": false, "fileType": "hwpx", "file": "보고서.hwpx", "error": "암호화된 문서입니다 …", "code": "ENCRYPTED" }
```

- 성공 출력과 겹치지 않습니다: markdown 성공은 텍스트, chunks 성공은 JSON **배열**, 실패는 언제나 `success:false` **객체**. `-o`/`-d` 면 실패한 파일의 출력물은 만들지 않고, 여러 파일이면 실패마다 한 개씩 나옵니다.
- **안정성 보증**: 종료 코드(성공 0 / 실패 1)와 필드(`success`·`fileType`·`error`·`code`)는 유지, `code` 값과 `file`(basename) 필드는 **추가만** 됩니다. `error` 문구는 사람용이라 계약이 아닙니다.

| `code` | 의미 |
|---|---|
| `ENCRYPTED` | 열기 암호 문서 (`--password` 필요 또는 불일치) |
| `DRM_PROTECTED` | 한컴 문서보안(DRM) — 열 수 없음 |
| `UNSUPPORTED_FORMAT` | 지원하지 않는 형식 |
| `CORRUPTED` | 시그니처 불일치·복구 불가 손상 |
| `IMAGE_BASED_PDF` | 텍스트층 없는 스캔 PDF (`--ocr` 필요) |
| `ZIP_BOMB` / `DECOMPRESSION_BOMB` | 압축 폭탄 방어 발동 |
| `NO_SECTIONS` | 본문 섹션 없음 |
| `OUTPUT_TOO_LARGE` | 출력 직렬화가 런타임 문자열 한계 초과 |
| `MISSING_DEPENDENCY` | 선택 의존성 미설치 (pdfjs-dist 등) |
| `EMPTY_INPUT` | 빈 입력 |
| `FILE_NOT_FOUND` | 입력 경로 없음 (ENOENT) |
| `PARSE_ERROR` | 그 외 파싱 실패 |

### 이미지 번들 — `images/<문서 이름>/manifest.json`

`-o`/`-d` 로 저장하면 추출 이미지는 문서마다 `images/<문서 이름>/`(`-o` 출력 파일 이름 또는 `-d` 입력 파일 이름에서 확장자를 뺀 것)에 `manifest.json` 과 함께 저장되고, Markdown 링크도 그 폴더를 가리킵니다(공백·괄호는 퍼센트 인코딩). 여러 문서를 같은 폴더로 변환해도 그림이 덮어쓰이지 않습니다. `--format json --image-refs` 는 이미지 바이트 대신 이 경로만 남깁니다.

```json
[ { "name": "image_001.png", "mimeType": "image/png", "bytes": 68, "source": "BinData/image1.png" } ]
```

- `mimeType` 은 **매직바이트 실측 우선**(PNG/JPEG/GIF/BMP/WMF/EMF) — 실측 불가 형식(TIFF·SVG 등)은 선언값 그대로.
- `source` 는 원본 컨테이너 항목명(HWPX/DOCX ZIP 경로, HWP5 BinData 스토리지명). PDF 처럼 재인코딩한 이미지에는 없습니다.
- 확장자: **PDF 는 항상 `png`**(순수 JS 재인코딩) · HWP5 는 스니프 유래 `png/jpg/gif/bmp`(WMF/EMF 는 `bin`) · HWPX 는 원본 확장자 유래 `png/jpg/gif/bmp/tif/wmf/emf/svg`(미지 확장자 `bin`) · DOCX 는 원본 확장자. 재인코딩 없이 원형 그대로이니 형식 판정은 manifest 를 믿으세요.

---

## 🤖 MCP 서버

자동 설치는 [`npx -y kordoc setup`](#ai-에이전트-연동-mcp--30초). 수동 등록:

```bash
codex mcp add kordoc -- npx -y kordoc mcp          # Codex
```

```json
{ "mcpServers": { "kordoc": { "command": "npx", "args": ["-y", "kordoc", "mcp"] } } }
```

Windows 에서 Claude Desktop 이 `.cmd` 를 못 찾으면 `"command": "cmd", "args": ["/c", "npx", "-y", "kordoc", "mcp"]`.

**17개 도구**

| 도구 | 설명 |
|------|------|
| `parse_document` | HWP/HWPX/PDF/XLSX/DOCX → Markdown (메타데이터 포함) |
| `detect_format` | 매직 바이트로 포맷 감지 |
| `parse_metadata` | 메타데이터만 빠르게 |
| `parse_pages` | 특정 쪽 범위만 |
| `parse_table` | N번째 표만 |
| `parse_chunks` | RAG 구조 청크 JSON — 헤딩·개조식 위계 breadcrumb + 표 독립 청크 |
| `compare_documents` | 두 문서 비교 (교차 포맷) |
| `parse_form` | 양식 필드를 JSON 으로 |
| `fill_form` | 양식에 값 채우기 (HWPX 서식 보존, 서식·유일성 가드, 내장 `template`) |
| `patch_document` | 편집한 Markdown 을 원본 HWPX/HWP 에 서식 보존 반영 |
| `extract_profile` | 참조 HWPX 의 표 서식 프로필 JSON — `generate_document` 의 `profile_path` 로 재현 |
| `generate_document` | Markdown(표·수식·차트) → HWPX, 공문서 프리셋 |
| `place_seal` | 도장/서명 이미지를 앵커 문구 위에 부유 배치 |
| `render_document` | HWPX·HWP 를 조판 그대로 PNG/JPEG(응답 이미지)·SVG/HTML/PDF(파일)로 — 생성·수정 결과를 AI 가 눈으로 검증 |
| `redact_document` | 개인정보 탐지 + 서식 보존 마스킹 (HWPX/HWP 는 머리말·각주·미리보기·문서 정보까지 + 잔존 재검사, 그 외는 마스킹된 Markdown) |
| `crop_regions` | 렌더 영역(표·이미지·문단·도형)을 쪽 이미지에서 실배율로 잘라 저장 + regions.json |
| `extract_tables` | 표 분류(데이터표/조직도류/불확실) + 쪽·bbox + 정책별 crop — 조직도는 이미지로, 데이터표는 구조로 |

---

## 📚 API

### 파싱

| 함수 | 설명 |
|------|------|
| `parse(buffer, options?)` | 포맷 자동 감지 → Markdown + `IRBlock[]` (파일 경로 문자열도 받음) |
| `parseHwpx` · `parseHwp` · `parseHwp3` · `parseHwpml` | HWPX · HWP 5.x · HWP 3.x(1996~2002) · HWPML 전용 — 모두 `(buffer, options?)` |
| `parsePdf` · `parseDocx` · `parseXlsx` · `parseXls` | PDF · DOCX · XLSX · XLS(Excel 97~2003, BIFF8) 전용 |
| `parseImage(buffer, options?)` | 이미지(PNG/JPG/WebP) 전용 — 내장 OCR 상시 적용 |
| `detectFormat(buffer)` | 동기 매직 바이트 감지 — 하위 호환을 위해 ZIP 은 `hwpx`, OLE2 는 `hwp` 반환 |
| `await detectZipFormat(buffer)` | ZIP 내부 구조로 `hwpx`·`xlsx`·`docx`·`pptx`·`unknown` 구분 |
| `detectOle2Format(buffer)` | OLE2 내부 스트림으로 `hwp`·`xls`·`unknown` 구분 |

PPTX 는 감지만 합니다 — `parse()` 는 `success: false`·`fileType: "pptx"`·`code: "UNSUPPORTED_FORMAT"`. ZIP 을 구분해 라우팅하려면 `detectFormat()` 이 `hwpx` 일 때 `await detectZipFormat(buffer)` 로 세분화하세요.

### 비교 · 양식 · 편집

| 함수 | 설명 |
|------|------|
| `compare(bufferA, bufferB, options?)` | IR 레벨 문서 비교 |
| `extractFormFields(blocks)` / `extractFormSchema(blocks)` | 양식 필드 인식 / + 타입·필수·빈값 추론 |
| `fillForm(input, values, outputFormat?)` | 양식 채우기 — `"markdown"`(기본)·`"hwpx"`·`"hwpx-preserve"`, 반환 `{ output, format, fill }` |
| `fillFormFields(blocks, values)` | IRBlock[] 기반 필드 값 교체 |
| `fillHwpx(buffer, values)` | HWPX XML 직접 조작 (원본 서식 보존) |
| `extractClickHereFields(buffer)` | HWPX 누름틀(CLICK_HERE) 필드 조사 — 이름·안내문 |
| `resolveBuiltinTemplate(name)` / `readBuiltinTemplate(t)` | 내장 표준 기안문 서식 조회·로드 (`gian`·`gian-simple`) |
| `patchHwpx(original, editedMarkdown, options?)` | 편집 Markdown → 원본 HWPX 서식 보존 패치 |
| `patchHwp(original, editedMarkdown, options?)` | 편집 Markdown → 원본 HWP 5.x 바이너리 서식 보존 패치 |
| `openHwpxDocument(bytes, options?)` | 에디터용 블록 단위 증분 패치 세션 `HwpxSession` |
| `patchHwpxBlocks(bytes, edits, options?)` | 세션 없이 블록 편집 1회 패치 |
| `placeSealHwpx(buffer, seals)` | 도장/서명 이미지를 앵커 문구 위에 부유 배치 |
| `validateHwpx(buffer)` | HWPX 구조 검증 — ZIP·mimetype·필수 파트·XML 웰폼드 |

### 생성 · 렌더

| 함수 | 설명 |
|------|------|
| `markdownToHwpx(markdown, options?)` | Markdown → HWPX (테마·서식 프로필·쪽 옵션·공문서 프리셋) |
| `hwpxToProfile(buffer)` | 참조 HWPX → 표 서식 프로필 JSON (`markdownToHwpx(md, { profile })` 로 재현) |
| `markdownToPdf(markdown, options?)` / `blocksToPdf(blocks, options?)` | Markdown·IRBlock[] → PDF (`puppeteer-core` 별도 설치) |
| `renderHtml(blocks, options?)` | IRBlock[] → 인쇄용 HTML (puppeteer 불필요, 원문 HTML 은 허용 태그만 통과 + CSP) |
| `renderHwpxToSvg(buffer, options?)` | HWPX → 레이아웃 보존 SVG — 다페이지·형광펜·도형, 캐시 없으면 `reflow` |
| `renderDocument(입력, { format, pages?, … })` | HWPX·HWP(5.x) → 쪽별 svg/png/jpeg·문서 html/pdf 자산 + `RenderScene`(쪽 로컬 pt bbox·결정적 region id) |
| `extractRenderedRegions(입력, { types?, pages?, … })` | 표·이미지·문단·도형 영역을 쪽 이미지에서 실배율 crop |
| `extractTables(입력, { policy?, … })` | 표 분류(의미표/조직도류/불확실) + 렌더 영역 조인 + 정책별 crop |

### 텍스트 · 변환 도구

| 함수 | 설명 |
|------|------|
| `lintGongmunText(text, { document? })` | 공문서 표기법 19룰 + AI 슬롭 2룰 (`document: true` 면 붙임·"끝." 문서 단위 검사 포함) |
| `redactMarkdown(text, options?)` / `redactText(...)` | 개인정보 탐지 + 마스킹 — 텍스트 단위 (파일 단위는 CLI `redact`·MCP `redact_document`) |
| `blocksToChunks(blocks, options?)` | RAG 구조 청크 — 헤딩·개조식 위계 breadcrumb + 표 독립 청크 |
| `blocksToMarkdown(blocks)` | IRBlock[] → Markdown |
| `blocksToPages(blocks)` | IRBlock[] → `[{ pageNumber, markdown }]` |

### 타입

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

## 📂 지원 포맷

| 포맷 | 엔진 | 특징 |
|------|------|------|
| **HWPX** (한컴 2020+) | ZIP + XML DOM | 매니페스트, 중첩 표, 병합 셀, 손상 ZIP 복구, 조판 캐시 기반 실제 쪽 경계, 열기 암호, 양식 선택 상자·라디오 단추 |
| **HWP 5.x** (한컴 레거시) | OLE2 + CFB | 배포용 복호화, 열기 암호, 손상 CFB 복구, 각주·하이퍼링크, 21종 제어문자, 이미지 추출, 실제 쪽 경계 |
| **HWP 3.x** (1996~2002) | 단일 binary | 상용조합형 → 유니코드, 한자·기호 5,893자 lookup, 중첩 문단, 아래아(옛한글), 열기 암호 |
| **HWPML 2.x** (XML HWP) | XML DOM | HeadingType 기반 헤딩, 병합 셀, DoS 방어 |
| **PDF** | pdfjs-dist | 선·클립·무괘선 표, XY-Cut 읽기 순서, 2단 지면, 헤딩, 각주·미주, 수식 글꼴 복원, OCR, 밑줄·링크, 이미지 추출, 텍스트 품질 신호 |
| **XLSX** (Excel) | ZIP + XML DOM | 공유 문자열, 병합 셀, 다중 시트, 수식 표시, 날짜 셀 ISO 변환, 대형 시트 스트리밍 |
| **XLS** (Excel 97~2003) | OLE2 + BIFF8 | Workbook 스트림, SST 공유 문자열, 셀·시트 추출 |
| **DOCX** (Word) | ZIP + XML DOM | 스타일 헤딩, 번호 매기기(실제 번호 라벨), 각주, 하이퍼링크, 이미지 추출 |
| **이미지** (PNG/JPG/WebP) | sharp + 내장 OCR | 스크린샷·스캔 이미지 직접 입력, 래스터 괘선으로 표 복원 |

---

## 🔒 보안

- 프로덕션급 방어: ZIP bomb·압축 폭탄, XXE·Billion Laughs, 경로 순회 차단, MCP 에러 정제·출력 경로 재검사(`O_NOFOLLOW`), watch webhook SSRF·DNS 리바인딩 차단, 파일 크기 제한(500MB), 인쇄·렌더 PDF 의 JavaScript·외부 요청 차단. 자세한 내용은 [SECURITY.md](./SECURITY.md).
- **폐쇄망(내부망) 배포** — `KORDOC_OFFLINE=1` 로 모든 아웃바운드 통신(OCR 모델 다운로드·watch webhook)을 요청 전에 차단하고, `KORDOC_ROOT=<디렉토리>` 로 MCP 서버의 파일 읽기·쓰기를 그 하위로 제한합니다(둘 다 opt-in). 오프라인 설치 번들은 `node scripts/pack-offline.mjs [--with-ocr] [--with-models]`, OCR 모델은 `kordoc models --export/--import`(SHA-256 검증)로 옮깁니다. 절차·보안성 검토 근거: [docs/offline-deployment.md](docs/offline-deployment.md).

---

## 📝 최근 변경

### v4.16.0
- **PDF 글·표**: 원본 HWPX·DOCX 정답 기준 글자 재현율 99.8%·정확도 99.6%·읽기 순서 99.1%·어절 F1 98.8%, 표 칸까지 완전 일치 97.0%.
- **PDF 복원**: 쪽 아래 각주·문서 끝 미주를 참조 자리로, 목차 점선·책 가장자리 색인 탭·서식 밑줄 빈칸·중·일문 줄 꺾임·보도자료 연락처 표.
- **자동 OCR**: 텍스트층 없는 쪽(스캔·곡선 글자)을 OCR 모델 캐시가 있으면 자동으로 — ODL 200 기본 0.940 (`ocr: false` 로 끔).
- **DOCX**: 번호 목록이 "1." 대신 실제 번호("[3]"·"5.1"·"A.1").
- **CLI 그림 경로 변경** (#98): 그림을 문서마다 `images/<문서 이름>/` 에 — 여러 문서를 같은 폴더로 변환해도 안 덮어씀.
- `render --reflow` 호환(#97) · 제한 네트워크 linux/x64 설치 안내(#99) · webhook·MCP 출력·HTML 렌더 보안 보강(#100).

### v4.15.7
- **중첩표**: HWP5 표를 같은 문서의 HWPX 와 같은 모양으로(여러 쪽 본문 상자만 문단), 3~8단 중첩표가 HWPX·HWP5·PDF 모두 단 수 그대로. HWP·HWPX → Markdown 표(1열 제외) HWP 3,111/3,111·HWPX 9,122/9,123 일치.
- **PDF**: 가려진 글 제외, 세로쓰기 글상자, 자간 벌린 영문, TeX 수식 글꼴 기호, 장 번호 제목, 칸 안 줄마다 적은 숫자 목록 — ODL 기본 0.937·`ocr: true` 0.960.
- **새 옵션**: `plain`(글 위주), `htmlTables`(모든 표를 들여쓴 HTML) — OCR 없이 0.949·OCR 0.971.
- 이슈 #91~#95: 희소 XLSX, 누름틀 안내문, 암호 HWPX Windows 멈춤, `-o` 그림 링크, `generate --image-dir` 한글 이름.

### v4.15.6
- **PDF 구조**: ODL 200 종합 0.9055 → 0.9345(읽기 순서 0.938·표 0.931·제목 0.926) — 워드·슬라이드 표(음영 칸·투명 글상자·위아래 괘선만 있는 여러 줄 머리), 작은 대문자·옛 숫자 글리프, 여백 세로 도장, 사이드바 소제목, 칸 안 영문 줄바꿈·쪼개진 링크.
- `ocr: true` 가 차트·로고 같은 그림 속 글을 영역마다 읽음(0.952), 기본값은 OCR 필요 쪽을 경고로 알림.

### v4.15.5
- **PDF 표·2단 지면**: 세로선만 내려 그은 머리·합계 행, 머리행만 음영 상자로 두른 표, 가로 괘선만 있는 학술지 표를 한 표로. 2단 지면에서 그림 옆 캡션을 먼저, 각주를 본문 뒤에 — ODL 200 0.775 → 0.906.
- PDF 제목 오탐 두 유형(#89), 없는 입력 파일 실패 코드 `FILE_NOT_FOUND`(#88).

### v4.15.4 · v4.15.3 · v4.15.2
- **v4.15.4**: 한국 PDF 밀집 표 행·클립 경계 복원(표 exact 2,512 → 2,526/2,692), ODL 200 제목·정렬 수치표 개선(0.725 → 0.775).
- **v4.15.3**: 쪽을 넘는 중첩표의 머리 행과 다음 쪽 본문이 감싸개 때문에 갈라지던 것 복원(중첩표 157 → 158/176), 셀 클립이 많은 쪽의 클립 묶음 시간 단축.
- **v4.15.2**: PDF 표의 좁은 시각적 간격을 빈 행·열로 늘리던 것 감소(여러 행에 반복되는 실제 빈 열은 유지), 밀집 괘선 교차점 메모리 절감.

### v4.15.1
- **PDF 안정성·속도**: 매우 긴 괘선의 메모리 폭증 수정, 쪽 처리 후 자원 해제·반복 그림 처리 개선, 입력 ArrayBuffer 재사용 가능, 쪽 수 상한으로 잘린 범위 경고.
- **PDF 글·표**: 원점 이동·회전된 쪽과 Form XObject 좌표, 좁은 빈 열, 쪽을 넘는 중첩표·비고, 표 아래 주석·출처가 꼬리말로 지워지던 것, 쪽별 Markdown.
- **OCR**: JPEG EXIF 방향 반영, 큰 이미지 최대 24MP 축소, 검출 상자 3,000개까지(초과는 경고), 괘선 검출 반복 계산 감소.
- **인명 마스킹**(opt-in): 속기록·회의록 문맥 이름 추가 탐지(외부 정답 361/411, 오탐 0).

### v4.15.0
- **긴 스프레드시트**: XLSX·XLS 1만 행 무경고 절단 수정(칸 예산 초과는 경고), XLSX 행 묶음 읽기·XLS 희소 격자로 메모리 절감, 동아시아 날짜·DOCX 머리글/바닥글.
- **PDF 글**: 실제 낱말을 붙이던 균등배분 정리, 표 칸 글자 조각, 날짜 빈칸, 넓은 줄간격 문단 이음.
- **보안**: HTML 표 칸 원문 이스케이프, 인쇄·렌더 PDF 의 JavaScript 끔·`data:`·`about:` 외 요청 차단, webhook IPv6 SSRF·MCP 쓰기 경로 제한.
- **안정성**: CLI·MCP·parse-worker 진단 메시지를 stderr 로(JSON 출력 보호), 확장자가 실제 형식과 다른 문서의 무손실 패치, 문서 비교·여러 구간 치환 속도.
- **마스킹**(opt-in): 회의록 발언자·기관 직함 앞 이름·결재란·도로명 변형.
- **`watch -d`**: 하위 폴더 구조 보존([PR #82](https://github.com/chrisryugj/kordoc/pull/82), @ROTl24).
- **검증 코퍼스**: 정책브리핑 HWPX↔PDF 300쌍, DOCX↔LibreOffice PDF 36쌍, XLS 정답지 트랙.

이전 버전 전체 이력은 **[CHANGELOG.md](CHANGELOG.md)** 에 있습니다.

---

## 만든 사람

대한민국 지방공무원. 광진구청에서 7년간 HWP 파일과 싸우다가 이걸 만들었습니다. 5개 공공 프로젝트에서 수천 건의 실제 관공서 문서를 파싱하며 검증했습니다.

## 라이선스

[MIT](./LICENSE). 이 프로젝트는 아래 오픈소스를 포함합니다:

- **rhwp** (MIT, edwardkim) — HWP5 배포용 복호화·lenient CFB 파싱 알고리즘, `templates/` 의 기안문 서식
- **claw-hwp** (MIT, DoHyun468) — OOXML chartSpace 조립, 도장 부유 배치 메트릭, secure-fill 포맷엔진, validate 검사셋
- **OpenDataLoader PDF** (Apache 2.0, Hancom Inc.) — PDF 표 감지 알고리즘
- **hml-equation-parser** (Apache 2.0, Open Bapul) — HML 수식 파싱
- **PaddleOCR** (Apache 2.0, PaddlePaddle) — 텍스트 OCR 엔진 파생 (PP-OCRv5 korean)
- **Pix2Text** (MIT, breezedeus) — 수식 OCR(MFD/MFR) 알고리즘 포팅. 모델은 런타임 다운로드이며 재배포하지 않습니다 — MFD 가중치의 기반인 Ultralytics YOLOv8 은 AGPL-3.0 이므로 수식 OCR 에 의존하는 상용·비공개 제품은 해당 조건을 별도 확인하세요
- **cfb** (Apache 2.0, SheetJS) — HWP5 OLE2 컨테이너 파싱
- **pdfjs-dist** (Apache 2.0, Mozilla) — PDF 텍스트 추출
- **JSZip** (MIT, Stuart Knightley 외) — ZIP 기반 포맷 파싱

전체 고지는 [NOTICE](./NOTICE), 라이선스 전문은 `THIRD_PARTY/` — 둘 다 npm 배포 패키지에 포함됩니다.
