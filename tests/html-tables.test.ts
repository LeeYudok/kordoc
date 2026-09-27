/** htmlTables 옵션 — 모든 표를 태그마다 한 줄씩 들여쓴 HTML 로 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { toHtmlTables } from "../src/html-tables.js"

describe("toHtmlTables", () => {
  it("turns a pipe table into indented HTML, unescaping Markdown and escaping HTML", () => {
    const md = "앞 글\n\n| 구분 | 값 \\| 비고 |\n| --- | --- |\n| a\\*b | 1 < 2<br>둘째 줄 |\n\n뒤 글"
    assert.equal(toHtmlTables(md), [
      "앞 글", "",
      "<table>", " <tr>", "  <th>", "   구분", "  </th>", "  <th>", "   값 | 비고", "  </th>", " </tr>",
      " <tr>", "  <td>", "   a*b", "  </td>", "  <td>", "   1 &lt; 2<br>둘째 줄", "  </td>", " </tr>", "</table>",
      "", "뒤 글",
    ].join("\n"))
  })

  it("re-indents kordoc HTML tables, nested ones included, without blank lines", () => {
    const md = "<table>\n<tr><th colspan=\"2\">머리</th></tr>\n<tr><td><table>\n<tr><th>안</th></tr>\n</table></td><td>칸</td></tr>\n</table>"
    const out = toHtmlTables(md)
    assert.ok(!/\n\s*\n/.test(out))
    assert.match(out, /^<table>\n <tr>\n  <th colspan="2">\n   머리\n  <\/th>/)
    assert.match(out, /\n  <td>\n   <table>\n    <tr>\n     <th>\n      안\n/)
  })
})
