import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicationCitationFormats } from "../src/lib/publication-citations.js";

test("buildPublicationCitationFormats creates all citation formats", () => {
  const citations = buildPublicationCitationFormats({
    id: "pub-test",
    authors: "Ada Lovelace and Alan Turing",
    year: "2024",
    title: "A Study of Analytical Engines",
    venue: "Journal of Testing",
    volume: "12",
    issue: "3",
    pages: "10-24",
    doi: "10.1234/example",
    url: "https://example.com/paper",
    type: "journal article",
    section: "Journal Articles and Book Chapters",
  });

  assert.match(citations.apa, /Ada Lovelace and Alan Turing/);
  assert.match(citations.apa, /\(2024\)/);
  assert.match(citations.apa, /Journal of Testing, 12\(3\), 10-24/);
  assert.match(citations.apa, /https:\/\/doi\.org\/10\.1234\/example/);

  assert.match(citations.bibtex, /@article\{pub-test-2024,/);
  assert.match(citations.bibtex, /author = \{Ada Lovelace and Alan Turing\}/);
  assert.match(citations.bibtex, /journal = \{Journal of Testing\}/);
  assert.match(citations.bibtex, /doi = \{10\.1234\/example\}/);

  assert.match(citations.ris, /TY  - JOUR/);
  assert.match(citations.ris, /AU  - Ada Lovelace and Alan Turing/);
  assert.match(citations.ris, /TI  - A Study of Analytical Engines/);
  assert.match(citations.ris, /UR  - https:\/\/example\.com\/paper/);

  assert.match(citations.plain, /A Study of Analytical Engines/);
  assert.match(citations.plain, /https:\/\/doi\.org\/10\.1234\/example/);
});

test("buildPublicationCitationFormats falls back gracefully when fields are missing", () => {
  const citations = buildPublicationCitationFormats({
    id: "pub-fallback",
    title: "Untitled Example",
  });

  assert.match(citations.apa, /n\.d\./);
  assert.match(citations.bibtex, /@misc\{pub-fallback,/);
  assert.match(citations.ris, /TY  - GEN/);
  assert.match(citations.plain, /Untitled Example/);
});

test("buildPublicationCitationFormats uses sourceUrl when url is missing", () => {
  const citations = buildPublicationCitationFormats({
    id: "pub-source-only",
    authors: "Grace Hopper",
    year: "2023",
    title: "Source-only Example",
    sourceUrl: "https://example.com/source",
  });

  assert.match(citations.apa, /https:\/\/example\.com\/source/);
  assert.match(citations.bibtex, /url = \{https:\/\/example\.com\/source\}/);
  assert.match(citations.ris, /UR  - https:\/\/example\.com\/source/);
});
