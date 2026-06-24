import assert from "node:assert/strict";
import test from "node:test";

import {
  collectSheetUrlLinks,
  getEmbeddableVideoSrc,
  isEmbeddableVideoUrl,
  isFeaturedTalkCard,
} from "../src/lib/url-links.js";

test("collectSheetUrlLinks exposes every non-root URL column as a labeled link", () => {
  const links = collectSheetUrlLinks({
    URL: "https://example.com/root",
    "PDF URL": "https://example.com/paper.pdf",
    "Slides URL": "https://example.com/slides",
    "Source URL": "https://example.com/source",
    "Repo URL": "https://example.com/repo",
    "Docs URL": "https://example.com/docs",
    "Profile URL": "https://example.com/profile",
    "Video URL": "https://example.com/video",
    Video: "https://www.youtube.com/embed/example",
    "Ignored": "https://example.com/ignored",
    "Empty URL": "",
  });

  assert.deepEqual(links, [
    { label: "PDF", href: "https://example.com/paper.pdf" },
    { label: "Slides", href: "https://example.com/slides" },
    { label: "Source", href: "https://example.com/source" },
    { label: "Repo", href: "https://example.com/repo" },
    { label: "Docs", href: "https://example.com/docs" },
    { label: "Profile", href: "https://example.com/profile" },
    { label: "Video", href: "https://example.com/video" },
    { label: "Video", href: "https://www.youtube.com/embed/example" },
  ]);
});

test("isEmbeddableVideoUrl recognizes common embed-style video urls", () => {
  assert.equal(isEmbeddableVideoUrl("https://www.youtube.com/embed/y2O5POE7p6Y"), true);
  assert.equal(isEmbeddableVideoUrl("https://player.vimeo.com/video/123456"), true);
  assert.equal(isEmbeddableVideoUrl("https://vimeo.com/123456"), true);
  assert.equal(isEmbeddableVideoUrl("https://example.com/watch"), false);
});

test("getEmbeddableVideoSrc normalizes vimeo and iframe embeds to player urls", () => {
  assert.equal(getEmbeddableVideoSrc("https://vimeo.com/123456"), "https://player.vimeo.com/video/123456");
  assert.equal(getEmbeddableVideoSrc("https://youtu.be/y2O5POE7p6Y"), "https://www.youtube.com/embed/y2O5POE7p6Y");
  assert.equal(
    getEmbeddableVideoSrc('<iframe src="https://www.youtube.com/embed/y2O5POE7p6Y" allowfullscreen></iframe>'),
    "https://www.youtube.com/embed/y2O5POE7p6Y",
  );
  assert.equal(
    getEmbeddableVideoSrc('<iframe src="https://player.vimeo.com/video/123456" allowfullscreen></iframe>'),
    "https://player.vimeo.com/video/123456",
  );
  assert.equal(getEmbeddableVideoSrc('<iframe allowfullscreen></iframe>'), "");
  assert.equal(getEmbeddableVideoSrc('<iframe src="javascript:alert(1)"></iframe>'), "");
});

test("isFeaturedTalkCard uses the talks video field to flag featured cards", () => {
  assert.equal(isFeaturedTalkCard({ videoUrl: "https://www.youtube.com/embed/y2O5POE7p6Y" }), true);
  assert.equal(isFeaturedTalkCard({ videoUrl: "https://example.com/watch" }), false);
  assert.equal(isFeaturedTalkCard({}), false);
});
