/** plain 옵션 — 그림 자리 표시·링크 URL·밑줄/굵게 표기를 걷은 글 위주 Markdown */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { toPlainMarkdown } from "../src/plain-markdown.js"

describe("toPlainMarkdown", () => {
  it("drops image placeholders and link URLs, keeps link text and structure", () => {
    const md = "# 제목\n\n본문 [기사](https://example.com/a_b) 참고.\n\n![image](image_001.png)\n\n| 칸 | <img src=\"x.png\" alt=\"image\"> |\n| --- | --- |"
    assert.equal(toPlainMarkdown(md), "# 제목\n\n본문 기사 참고.\n\n| 칸 |  |\n| --- | --- |")
  })

  it("removes underline tags and bold markers but not escaped asterisks", () => {
    assert.equal(toPlainMarkdown("**중요** <u>밑줄</u> \\*\\*별표\\*\\*"), "중요 밑줄 \\*\\*별표\\*\\*")
  })
})
