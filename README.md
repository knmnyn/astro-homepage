# Astro Homepage for Min

This repository is the Astro build for Min-Yen Kan's personal homepage and its subpages.

The current repo has two parts:

- a stock Astro starter in `src/`
- a Google Sheets-to-JSON content pipeline in `scripts/` and `content-sources.yml`

The site itself is still being assembled, but the content model and data ingestion flow are already in place.

## Current State

What is here now:

- Astro 7 app scaffold
- starter layout and placeholder homepage
- sheet-based content source registry in `content-sources.yml`
- a watcher/sync script that fetches published Google Sheets CSVs
- generated JSON written to `src/generated/content-sources/`
- a spreadsheet template for authoring the homepage content

What is not yet finished:

- the real homepage shell
- section pages like Research, Teaching, Publications, Software, Service, and Personal
- Astro components wired to the generated sheet data

## Homepage Design

The homepage is designed as a classic academic profile site with a clear information hierarchy.

### Top-Level Structure

- Identity block
  - name
  - title and role
  - office/contact information
  - avatar or portrait area
  - external links
- Navigation
  - Research
  - Teaching
  - Publications
  - Software
  - Service
  - Miscellaneous / Personal pages
- Content sections
  - overview and bio
  - student roster
  - teaching history
  - publication lists
  - talks and invited lectures
  - grants and awards
  - software projects
  - service roles
  - personal notes and side links

### Visual Direction

- clean academic layout
- readable typography first
- compact but scannable rows for long lists
- cards or timeline styling for talks, students, and links
- one shared shell across all pages
- responsive layout that works on desktop and mobile

### Page Map

- `/` - overview and profile
- `/research` - research summary, student cohorts, talks, grants
- `/teaching` - current and past courses
- `/publications` - publication archive
- `/software` - project and tool list
- `/service` - committee and editorial service
- `/personal` - personal notes and miscellany

## Data Pipeline

Content is authored in Google Sheets and published as CSV per tab.

The repo keeps a YAML registry of the published sheet URLs:

- `content-sources.yml`

The watcher script reads that registry and turns each sheet into normalized JSON:

- `scripts/content-watcher.mjs`

Generated data is written here:

- `src/generated/content-sources/`

The generated output is ignored by Git.

### How It Works

1. Publish each Google Sheets tab as CSV.
2. Record the published CSV URLs in `content-sources.yml`.
3. Run the watcher.
4. The watcher fetches each CSV, parses it, and writes JSON.
5. Astro reads the generated JSON when building pages.

### Security Notes

The watcher intentionally validates inputs:

- sheet keys must be filename-safe
- CSV URLs must be published Google Sheets HTTPS URLs

This reduces path traversal and SSRF risk in the content sync step.

## Spreadsheet Authoring

A spreadsheet template was created for the content model and can be uploaded to Google Sheets.

Tabs currently defined:

- profile
- nav
- publications
- teaching
- students
- talks
- grants
- software
- service
- personal links

Each tab includes example rows based on the homepage content so the sheet is immediately usable.

## Project Structure

```text
/
├── content-sources.yml
├── scripts/
│   └── content-watcher.mjs
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   └── pages/
├── test/
│   └── content-watcher.test.mjs
└── package.json
```

## Commands

Run these from the project root.

```sh
npm install
npm run dev
npm run build
npm run preview
npm run sync:content
npm run watch:content
npm test
```

### Content Sync Commands

- `npm run sync:content`
  - one-shot pull of all published sheet CSVs
- `npm run watch:content`
  - continuous sync mode
- `node scripts/content-watcher.mjs --help`
  - show script usage and flags

## Files Worth Knowing

- [package.json](./package.json)
- [content-sources.yml](./content-sources.yml)
- [scripts/content-watcher.mjs](./scripts/content-watcher.mjs)
- [test/content-watcher.test.mjs](./test/content-watcher.test.mjs)

## Development Notes

- The repo still contains the default Astro starter pages and components.
- The real homepage will replace the starter content with data-driven components.
- The sheet pipeline is already ready for that transition.

## Next Steps

1. Replace the starter homepage with the real profile shell.
2. Add Astro components for each section type.
3. Read the generated JSON from `src/generated/content-sources/`.
4. Render the homepage and subpages from the sheet data.
5. Add navigation, page metadata, and responsive styling.
