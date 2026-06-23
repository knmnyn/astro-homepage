# Astro Homepage for Min

This repository is the Astro build for Min-Yen Kan's personal homepage and its subpages.

The current repo has two parts:

- an Astro 7 site shell in `src/`
- a Google Sheets-to-JSON content pipeline in `scripts/` and `content-sources.yml`

The site is now assembled as a single responsive homepage driven by the generated sheet data.

## Current State

What is here now:

- Astro 7 site shell
- a sheet-driven homepage shell in `src/pages/index.astro`
- sheet-based content source registry in `content-sources.yml`
- a watcher/sync script that fetches published Google Sheets CSVs
- generated JSON written to `src/generated/content-sources/`
- a static export script for copying the build output to a destination directory
- a cache-aware build/export wrapper that skips unchanged builds
- a gitignored HTML pipeline log that can be copied to the serving destination
- a spreadsheet template for authoring the homepage content

What is not yet finished:

- section pages like Research, Teaching, Publications, Software, Service, and Personal
- per-section Astro routes wired to the generated sheet data

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

### Exporting the Static Site

The export step copies the built `dist/` directory into a destination directory.
That destination can be a mounted or synced NUS `public_html` path, a local staging folder,
or any other directory that should receive the static site.

```sh
npm run build
npm run export:static -- --dest /path/to/public_html/astro-homepage
```

You can also combine both steps:

```sh
npm run build:export -- --dest /path/to/public_html/astro-homepage
```

If your NUS server storage is mounted locally, point `--dest` at that mounted path. If your workflow uses `public_html` directly on the server, sync the contents there with your preferred file transfer tool after the build.

### Export Script Reference

- Purpose
  - copy the Astro build output to a destination directory
- Invocation
  - `npm run export:static -- --dest /path/to/public_html/astro-homepage`
  - `npm run build:export -- --dest /path/to/public_html/astro-homepage`
- Flags
  - `--source <dir>` sets the source build directory
  - `--dest <dir>` sets the destination directory
  - `--clean` removes the destination directory before copying
  - `--help` prints usage and exits
- Environment
  - `EXPORT_SOURCE_DIR` overrides the source directory
  - `EXPORT_DEST_DIR` overrides the destination directory

### Build Cache Reference

The build/export wrapper hashes the site inputs and skips `astro build` when the inputs are unchanged.
Cache files live under `.cache/astro-homepage/` and are ignored by Git.

- Purpose
  - avoid rebuilding when the Astro inputs have not changed
- Invocation
  - `npm run build:export -- --dest /path/to/public_html/astro-homepage`
- Flags
  - `--force-build` ignores the input hash and rebuilds anyway
- Inputs covered by the build hash
  - `src/`
  - `public/`
  - `astro.config.mjs`
  - `content-sources.yml`
  - `package.json`
  - `package-lock.json`

### Pipeline Log

Each watcher and export run appends a row to a gitignored HTML log at `.cache/astro-homepage/pipeline-log.html`.
The export step copies that file into the destination directory as `pipeline-log.html`, so the served site can
show the latest run history without opening the local cache.

- Appended by
  - `scripts/content-watcher.mjs`
  - `scripts/export-static.mjs`
  - `scripts/build-and-export.mjs`
- Copied to destination as
  - `pipeline-log.html`
- Useful for checking
  - whether the watcher saw changes or used the cache
  - whether the export step copied files or skipped because nothing changed
  - when the pipeline was last refreshed

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
│   ├── build-and-export.mjs
│   ├── content-watcher.mjs
│   └── export-static.mjs
├── public/
│   ├── favicon.ico
│   └── favicon.svg
├── src/
│   ├── generated/
│   ├── layouts/
│   ├── lib/
│   └── pages/
├── test/
│   ├── build-and-export.test.mjs
│   ├── content-watcher.test.mjs
│   └── export-static.test.mjs
└── package.json
```

## Commands

Run these from the project root.

```sh
npm install
npm run dev
npm run build
npm run build:export
npm run export:static
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

### Static Export Commands

- `npm run export:static -- --dest /path/to/public_html/astro-homepage`
  - copy the built site into a destination directory
- `npm run build:export -- --dest /path/to/public_html/astro-homepage`
  - build the site and copy the result in one step
- `node scripts/export-static.mjs --help`
  - show export script usage and flags

## Files Worth Knowing

- [package.json](./package.json)
- [content-sources.yml](./content-sources.yml)
- [scripts/content-watcher.mjs](./scripts/content-watcher.mjs)
- [scripts/build-and-export.mjs](./scripts/build-and-export.mjs)
- [scripts/export-static.mjs](./scripts/export-static.mjs)
- [scripts/pipeline-log.mjs](./scripts/pipeline-log.mjs)
- [test/content-watcher.test.mjs](./test/content-watcher.test.mjs)
- [test/build-and-export.test.mjs](./test/build-and-export.test.mjs)
- [test/export-static.test.mjs](./test/export-static.test.mjs)
- [test/pipeline-log.test.mjs](./test/pipeline-log.test.mjs)

## Development Notes

- The homepage is now driven by the sheet-generated JSON in `src/generated/content-sources/`.
- The static export step is intentionally a directory copy so it can target a `public_html` mount or sync destination.
- The build/export wrapper skips `astro build` when the input hash is unchanged.
- The remaining work is mostly section routing and continued content refinement.

## Next Steps

1. Split the homepage sections into standalone Astro pages where useful.
2. Add an automated deployment step if the NUS server path is mounted consistently.
3. Keep refining the sheet schema as the site content grows.
