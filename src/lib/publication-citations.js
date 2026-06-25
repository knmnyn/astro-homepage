function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatVolumeIssue(volume, issue) {
  if (volume && issue) {
    return `${volume}(${issue})`;
  }

  return volume || issue || "";
}

function formatPages(pages = "") {
  return normalizeText(pages);
}

function publicationEntryType(publication = {}) {
  const type = normalizeText(publication.type).toLowerCase();
  const section = normalizeText(publication.section).toLowerCase();
  const source = `${type} ${section}`;

  if (source.includes("journal")) return "article";
  if (source.includes("book chapter")) return "incollection";
  if (source.includes("edited volume")) return "book";
  if (source.includes("conference") || source.includes("workshop") || source.includes("tutorial") || source.includes("poster") || source.includes("demonstration")) {
    return "inproceedings";
  }

  return "misc";
}

function escapeBibtex(value = "") {
  return normalizeText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}");
}

function toBibtexKey(publication = {}) {
  const base = normalizeText(publication.id || publication.title || "publication")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const year = normalizeText(publication.year);
  return [base, year].filter(Boolean).join("-");
}

export function buildPublicationCitationFormats(publication = {}) {
  const authors = normalizeText(publication.authors);
  const year = normalizeText(publication.year) || "n.d.";
  const title = normalizeText(publication.title);
  const venue = normalizeText(publication.venue);
  const volumeIssue = formatVolumeIssue(publication.volume, publication.issue);
  const pages = formatPages(publication.pages);
  const doi = normalizeText(publication.doi);
  const url = normalizeText(publication.url);
  const sourceUrl = normalizeText(publication.sourceUrl);
  const referenceUrl = url || sourceUrl;
  const kind = publicationEntryType(publication);
  const bibtexKey = toBibtexKey(publication);

  const citationSuffix = [venue, volumeIssue, pages].filter(Boolean).join(", ");
  const citationLinks = [doi ? `https://doi.org/${doi}` : "", referenceUrl].filter(Boolean);

  const plainParts = [
    authors ? `${authors}.` : "",
    `(${year}).`,
    title ? `${title}.` : "",
    citationSuffix ? `${citationSuffix}.` : "",
    citationLinks[0] ? citationLinks[0] : "",
  ].filter(Boolean);

  const apaParts = [
    authors ? `${authors}.` : "",
    `(${year}).`,
    title ? `${title}.` : "",
    citationSuffix ? `${citationSuffix}.` : "",
    citationLinks.join(" "),
  ].filter(Boolean);

  const bibtexFields = [
    authors ? `  author = {${escapeBibtex(authors)}}` : "",
    year ? `  year = {${escapeBibtex(year)}}` : "",
    title ? `  title = {${escapeBibtex(title)}}` : "",
    kind === "article" && venue ? `  journal = {${escapeBibtex(venue)}}` : "",
    (kind === "inproceedings" || kind === "incollection" || kind === "book") && venue ? `  booktitle = {${escapeBibtex(venue)}}` : "",
    publication.volume ? `  volume = {${escapeBibtex(publication.volume)}}` : "",
    publication.issue ? `  number = {${escapeBibtex(publication.issue)}}` : "",
    pages ? `  pages = {${escapeBibtex(pages)}}` : "",
    doi ? `  doi = {${escapeBibtex(doi)}}` : "",
    referenceUrl ? `  url = {${escapeBibtex(referenceUrl)}}` : "",
  ].filter(Boolean);

  const bibtex = `@${kind}{${bibtexKey},\n${bibtexFields.join(",\n")}\n}`;

  const ris = [
    `TY  - ${kind === "article" ? "JOUR" : kind === "book" ? "BOOK" : kind === "incollection" ? "CHAP" : kind === "inproceedings" ? "CPAPER" : "GEN"}`,
    authors ? `AU  - ${authors}` : "",
    year ? `PY  - ${year}` : "",
    title ? `TI  - ${title}` : "",
    venue ? `JO  - ${venue}` : "",
    publication.volume ? `VL  - ${publication.volume}` : "",
    publication.issue ? `IS  - ${publication.issue}` : "",
    pages ? `SP  - ${pages.split(/[-–]/)[0]}` : "",
    pages && pages.includes("-") ? `EP  - ${pages.split(/[-–]/).at(-1)}` : "",
    doi ? `DO  - ${doi}` : "",
    referenceUrl ? `UR  - ${referenceUrl}` : "",
    "ER  - ",
  ].filter(Boolean).join("\n");

  return {
    apa: apaParts.join(" "),
    bibtex,
    ris,
    plain: plainParts.join(" "),
  };
}
