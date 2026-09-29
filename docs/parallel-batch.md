# Parallel CLI conversion

Use `kordoc *.pdf --jobs 4 -d ./converted/` to convert documents with four reusable Node.js processes. The default remains `--jobs 1`. Work is scheduled one file at a time per worker; files and successful results are not loaded into the parent process. Each worker can reuse parser/OCR initialization across its files.

Multiple inputs in parallel mode require `--out-dir`. Input names must have distinct stems (case-insensitive), even across directories or extensions, because output files and image folders use those stems. Ambiguous names are rejected before conversion starts. Success output and image manifests use the existing conversion path. A file failure leaves other jobs running and makes the overall exit status nonzero. Failure JSON is written by the parent in completion order; a worker process crash aborts the batch and shuts down the remaining workers. SIGINT/SIGTERM also shuts down workers.

This is file-level parallelism. A single document follows the existing sequential path. The JavaScript `parse()` API, MCP tools, and `parse-worker` protocol are unchanged. `Promise.all()` on CPU-heavy parsing in one JavaScript runtime does not provide this process-level CPU parallelism.

Start with a small worker count and measure your files. Each worker has its own heap and native resources. Native OCR libraries already use threads, so more processes can oversubscribe the CPU or memory. Tiny files can take longer because worker startup dominates. Concurrent missing-model downloads use independent temporary files and only publish verified bytes; they may still download the same model more than once.

## Reproducible benchmark

```sh
npm run build
node bench/batch.mjs
# Or measure your own files, including HWP5:
node bench/batch.mjs /path/to/documents/*.hwp
# Optional: BATCH_JOBS=1,2,4 BATCH_REPS=3
```

The default benchmark creates 24 synthetic Korean HWPX documents, each with 12,000 added paragraphs, and 24 synthetic PDFs, each with 40 pages containing text and ruled lines. It runs each setting three times, reports median wall time including CLI/worker startup, and compares SHA-256 hashes of all outputs against the first run. Images are disabled; OCR is not enabled. On Linux it samples summed RSS of the parent and descendants every 25 ms. Shared pages are counted for each process, so this is not unique physical memory.

Measured 2026-09-29 on Linux/WSL, Node 22.23.2, Intel Core i7-10700 (8 cores / 16 logical CPUs):

| Workload | Jobs | Median seconds | Speedup | Peak summed RSS (MiB) |
| --- | ---: | ---: | ---: | ---: |
| HWPX | 1 | 11.778 | 1.00× | 381.5 |
| HWPX | 2 | 7.032 | 1.68× | 729.7 |
| HWPX | 4 | 4.191 | 2.81× | 1,396.6 |
| PDF | 1 | 5.864 | 1.00× | 228.0 |
| PDF | 2 | 3.208 | 1.83× | 431.9 |
| PDF | 4 | 2.430 | 2.41× | 682.7 |

A separate run with 24 copies of the tiny committed HWPX fixture took 0.222 s with one process, 0.378 s with two, and 0.375 s with four (three-run medians; identical outputs). Worker startup outweighed the small amount of parsing, supporting the sequential default.

All output hashes matched. These synthetic throughput results do not establish real-corpus PDF accuracy, OCR throughput, or HWP5 throughput. The external ODL 200-document and Korean government PDF corpora were unavailable in this checkout. No answer keys, scorers, or exclusion rules were changed.

## Validation

Type checking and ESM/CJS/declaration builds passed. The full test suite passed 2,584 tests, with 11 skipped and no failures. New integration coverage includes image bytes/manifests, Markdown/JSON/chunks parity, continued processing after failure, option validation, output collision rejection, worker crashes, and parent interruption. A separate HWP5 check used two local HWP5 fixtures (four copies each); all eight JSON outputs matched byte for byte with one versus four workers. Concurrent model downloads have a regression test using mocked downloads and real file/hash verification.

This checkout lacked Linux native packages for Rollup, sharp, and PDF canvas support. Validation used temporary external dependencies via `NODE_PATH`; the original checkout and its dependencies were left unchanged.
