import assert from "node:assert/strict";
import test from "node:test";

import { renderInlineMarkdown } from "../src/lib/inline-markdown.js";

test("renderInlineMarkdown supports basic inline formatting", () => {
  assert.equal(
    renderInlineMarkdown("Hello **bold** _italic_ `code` [site](https://example.com)"),
    'Hello <strong>bold</strong> <em>italic</em> <code>code</code> <a href="https://example.com/" rel="noreferrer">site</a>',
  );
});

test("renderInlineMarkdown escapes unsafe markup", () => {
  assert.equal(
    renderInlineMarkdown('<script>alert("x")</script> [bad](javascript:alert(1))'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; bad',
  );
});

test("renderInlineMarkdown supports block markdown", () => {
  assert.equal(
    renderInlineMarkdown(`\n# Heading\n\n- first\n- second\n\n> quoted text\n\n| A | B |\n|---|:---:|\n| 1 | 2 |\n\n![Alt text](https://example.com/image.png)`),
    '<h1>Heading</h1><ul><li>first</li><li>second</li></ul><blockquote><p>quoted text</p></blockquote><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table><img src="https://example.com/image.png" alt="Alt text" />',
  );
});

test("renderInlineMarkdown ignores unsafe image urls", () => {
  assert.equal(renderInlineMarkdown('![Alt text](javascript:alert(1))'), "");
});

test("renderInlineMarkdown allows safe inline html elements", () => {
  assert.equal(
    renderInlineMarkdown('Text <span class="pill">pill</span> <br> <a href="https://example.com" target="_blank">site</a> H<sub>2</sub>O and x<sup>2</sup>'),
    'Text <span class="pill">pill</span> <br /> <a href="https://example.com/" target="_blank" rel="noreferrer">site</a> H<sub>2</sub>O and x<sup>2</sup>',
  );
});

test("renderInlineMarkdown still escapes disallowed html elements", () => {
  assert.equal(
    renderInlineMarkdown('<script>alert("x")</script> <div>nope</div>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &lt;div&gt;nope&lt;/div&gt;',
  );
});
