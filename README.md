# Astro Homepage for Min

This repository contains the Astro build for Min-Yen Kan's personal homepage and its supporting content pipeline.

## Quickstart

```sh
npm install
npm run sync:content
npm run dev
```

Optional follow-ups:

```sh
npm run build
npm run preview
npm run build:export -- --dest /path/to/public_html/astro-homepage
```

The current repo has two parts:

- an Astro 7 site shell in `src/`
- a Google Sheets-to-JSON content pipeline plus export helpers in `scripts/` and `content-sources.yml`

The site is assembled as a single responsive homepage driven by generated sheet data, with light/dark theme support and an NUS-branded export path.

## Current State

What is here now:

- Astro 7 site shell
- a sheet-driven homepage shell in `src/pages/index.astro`
- sheet-based content source registry in `content-sources.yml`
- a watcher/sync script that fetches published Google Sheets CSVs
- generated JSON written to `src/generated/content-sources/`
- a static export script for copying the build output to a destination directory
- a cache-aware build/export wrapper that skips unchanged builds
- an Astro wrapper for build and preview commands that keeps exported asset URLs correct
- a gitignored HTML pipeline log that can be copied to the serving destination
- a spreadsheet template for authoring the homepage content
- a sheet-driven shared nav, where `Nav Header` controls the visible bar text and `Header` stays the canonical page title
- a compact theme switch and font-size control in the shared navigation
- per-section Astro routes wired to the generated sheet data
- any generated sheet column that ends in `URL` is surfaced as a clickable link labeled with the column text, except for the root `URL` field which continues to drive the primary title link
- the student sheet uses `Title`, `Avatar`, and `URL` for the current cohort cards

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
  - Misc / Personal pages
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
- NUS blue/orange accent colors
- light and dark theme modes with system-driven auto selection

### Page Map

- `/` - overview and profile
- `/research` - research summary, student cohorts, talks, grants
- `/teaching` - current and past courses
- `/publications` - publication archive
- `/service` - committee and editorial service
- `/misc` - software, personal links, and other archive material

## Data Pipeline

Content is authored in Google Sheets and published as CSV per tab.

The repo keeps a YAML registry of the published sheet URLs:

- `content-sources.yml`

The watcher script reads that registry and turns each sheet into normalized JSON:

- `scripts/content-watcher.mjs`

Generated data is written here:

- `src/generated/content-sources/`

The generated output is ignored by Git.

### Local Dev vs Exported Build

This repository intentionally uses two URL modes:

- `npm run dev` serves the site from `/` so local CSS and assets resolve normally.
- `npm run build` and `npm run preview` use the NUS export base path so copied files work under `~/public_html/astro-homepage/`.

Those build and preview commands are routed through `scripts/astro-command.mjs`, which sets `ASTRO_BASE_PATH=/~kanmy/astro-homepage/` for exported builds.

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

### Astro Command Wrapper

- Purpose
  - run Astro build and preview with the deployed NUS base path
- Invocation
  - `npm run build`
  - `npm run preview`
  - `node scripts/astro-command.mjs build`
  - `node scripts/astro-command.mjs preview`
- Behavior
  - `npm run dev` stays root-based for localhost work
  - build and preview set `ASTRO_BASE_PATH=/~kanmy/astro-homepage/`
- Notes
  - this keeps local styling working on localhost while still producing deployable URLs for the exported host

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

### Theme Switch

The shared layout includes a three-state theme control and a two-button font-size control in the navigation bar:

- `Auto`
- `Light`
- `Dark`

Theme choice is stored in the browser and applied to the homepage shell. Auto mode follows the user’s system preference.
The font-size control steps through `80%`, `100%`, and `120%`.

The shared chrome logic lives in:

- `src/layouts/Layout.astro`
- `src/lib/site-chrome.js`
- `src/components/section-nav.astro`

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

## Schema Reference

The generated sheets share a few conventions:

- `[#]` marks a metric-capable column
- `[|]` marks a sortable column
- `[!]` marks pinned row content
- `[*]` marks featured row content

The site strips these markers when reading values, so the visible label text stays clean in the UI while the markers still guide generation and presentation.

### Shared Row Rules

- `ID`
  - stable row identifier for the content model
- `Section`
  - publication archive grouping label used to split the archive into separate sections
- `Sort`
  - optional override for ordering when a component supports sorted rendering
- `Notes`
  - freeform supporting text
- `URL`-style fields
  - any field ending in `URL` is treated as a link when the component supports it
  - the talks sheet also treats `Video` as a link-bearing field so embed-style URLs can render as responsive players

### Nav

The nav sheet drives the shared navigation bar.

- `Nav Header`
  - visible label used in the bar
- `Header`
  - canonical page title or section name
- `Slug / Path`
  - page route path used for links
- `Order`
  - display order in the navigation bar
- `Visible`
  - `TRUE` rows are shown, `FALSE` rows are hidden
- `Summary`, `Kicker`, `Trailer`
  - optional markdown-capable text fields used for page copy and section kickers

### Research Talks

The talks sheet feeds the research archive and the homepage talk summary.

- `[#]ID`
  - stable row identifier
- `Sort`
  - optional override for talk ordering
- `[#]Role`
  - talk role or presentation type
- `[#]Record Type`
  - `Local` or `International`
- `Title`
  - talk title
- `Event`
  - event or host context
- `Location`
  - location text shown in the UI
- `[|]Date`
  - sortable date field
- `Slides URL`
  - optional slide link
- `Video`
  - optional video link or embed command; embed-style URLs render as responsive players
  - supported inputs include YouTube embed URLs, `youtu.be` links, Vimeo page/embed URLs, and raw `<iframe ...>` snippets
  - Vimeo page/embed forms are normalized to the Vimeo player URL before rendering
  - if an iframe snippet is supplied, the `src` attribute is extracted and used for the player
- `Notes`
  - optional supporting note

Talk cards with embeddable video URLs span the full grid width in the homepage and research layouts, while non-video talks stay in compact grid cards. When a talk has an embedded video, the player renders before the Slides link in the card footer.

The publications archive uses a 3-column grid within each section type on wide screens, collapsing to 2 columns on medium screens and 1 column on small screens so the standard card spacing stays intact while the page remains dense and readable.

The video parser is intentionally permissive enough to handle the spreadsheet's current export format, but it only extracts iframe `src` values and does not execute or preserve arbitrary iframe markup.

Default talk rendering keeps sheet row order unless `Sort` is populated. The research page applies that override; the base data layer should stay close to the raw watcher output.

### Research Grants

The grants sheet powers grant summaries and the research archive.

- `Start Year`, `End Year`
  - grant span
- `Record Type`
  - grant category or participation type
- `Title`
  - grant title
- `Role`
  - your role in the grant
- `Sponsor`
  - funding source
- `Amount`, `Currency`
  - optional amount display
- `Notes`
  - supporting text

### Other Content Sheets

The remaining sheets follow the same general pattern:

- `publications`
  - bibliographic records with title, venue, authors, year, and link fields
  - publication cards include a compact `Cite` button that opens a modal for APA, BibTeX, RIS, and plain-text copies
  - if the sheet provides `URL`, `DOI`, or `Source URL`, those are folded into the generated citation text when relevant
  - the citation modal opens with keyboard focus on the format tabs, supports Arrow Left/Right plus Home/End navigation, and traps Tab/Shift+Tab inside the panel until it is closed
- `teaching`
  - course history with academic year, term, course code, role, section, and notes
- `students`
  - supervision records with cohort, level, title, role, avatar, URL, interests, and status
- `software`
  - software/project records with name, description, repository/docs links, status, tags, and featured flag
- `service`
  - committee and editorial service records with year span, category, role, organization, description, and URL
- `personal links`
  - personal archive links with label, category, description, URL, and featured flag

The site strips the marker prefixes on read, so the component code can work with clean field names while the spreadsheet keeps the richer authoring hints. Sort chips compare numbers naturally, including decimal values and magnitude suffixes like `K`, `M`, and `B`, and also compare date-like values chronologically when a field contains dates such as `24 Aug 2018` or `2018-08-24`.

If a metric field value contains semicolons, the values are treated as separate categories for both chip counts and card highlighting. For example, `NLP; IR` contributes to both `NLP` and `IR`, and clicking either chip will highlight the matching cards.

Hero stat cards that summarize a `[#]` metric column should use the same metric parser so the displayed totals and labels stay in sync with the chips.

When a stat-card value is a semicolon-delimited list, the hero renderer deduplicates the values and displays them as a compact list, for example `DL;NLP` becomes `DL · NLP`.

Unit tests under `test/` cover the data normalization helpers, including URL-field labeling, embed detection, student sheet mapping, and nav text extraction.

## Project Structure

```text
/
├── content-sources.yml
├── scripts/
│   ├── astro-command.mjs
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
│   ├── pipeline-log.test.mjs
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

### Testing

Run the full automated test suite with:

```sh
npm test
```

That command uses Node's built-in test runner and executes every file in `test/`.

To run a focused subset while iterating:

```sh
node --test test/site-chrome.test.mjs test/sheet-metrics.test.mjs
```

Test naming standard:

- test files live in `test/`
- file names use `kebab-case.test.mjs`
- each file should cover one module or closely related feature area
- test case names should describe the behavior being verified, not the implementation detail
- new test files automatically run under `npm test` as long as they match the `.test.mjs` pattern

Notes:

- `npm run dev` is the best command for local CSS and theme iteration.
- `npm run build` and `npm run preview` go through the Astro wrapper so exported URLs keep working.

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

### Rsync Deployment

If your NUS `public_html` directory is reachable over SSH, you can sync the exported files with `rsync`.

Dry-run first:

```sh
rsync -avzn --delete outputs/public_html/astro-homepage/ USER@HOST:~/public_html/astro-homepage/
```

Then run the real copy:

```sh
rsync -avz --delete outputs/public_html/astro-homepage/ USER@HOST:~/public_html/astro-homepage/
```

- `-a` preserves file attributes as much as possible
- `-v` shows what changed
- `-z` compresses data in transit
- `-n` is the dry-run flag and should be removed for the real deploy
- `--delete` removes files on the server that are no longer in the export output
- the trailing slash on the source path means “copy the contents of this directory”

### Build / Preview Commands

- `npm run build`
  - build the site with the NUS export base path
- `npm run preview`
  - preview the built site with the same export base path
- `node scripts/astro-command.mjs --help`
  - show wrapper usage

## Files Worth Knowing

- [package.json](./package.json)
- [content-sources.yml](./content-sources.yml)
- [scripts/astro-command.mjs](./scripts/astro-command.mjs)
- [scripts/content-watcher.mjs](./scripts/content-watcher.mjs)
- [scripts/build-and-export.mjs](./scripts/build-and-export.mjs)
- [scripts/export-static.mjs](./scripts/export-static.mjs)
- [scripts/pipeline-log.mjs](./scripts/pipeline-log.mjs)
- [src/lib/site-chrome.js](./src/lib/site-chrome.js)
- [src/lib/sheet-metrics.js](./src/lib/sheet-metrics.js)
- [test/content-watcher.test.mjs](./test/content-watcher.test.mjs)
- [test/build-and-export.test.mjs](./test/build-and-export.test.mjs)
- [test/export-static.test.mjs](./test/export-static.test.mjs)
- [test/pipeline-log.test.mjs](./test/pipeline-log.test.mjs)
- [test/site-chrome.test.mjs](./test/site-chrome.test.mjs)
- [test/metric-scope.test.mjs](./test/metric-scope.test.mjs)
- [test/sheet-metrics.test.mjs](./test/sheet-metrics.test.mjs)

## Development Notes

- The homepage is now driven by the sheet-generated JSON in `src/generated/content-sources/`.
- The static export step is intentionally a directory copy so it can target a `public_html` mount or sync destination.
- The build/export wrapper skips `astro build` when the input hash is unchanged.
- The shared nav uses compact theme and font-size controls, so browser text scaling stays local to the session.
- The remaining work is mostly content refinement and visual polish.

## Next Steps

1. Split the homepage sections into standalone Astro pages where useful.
2. Add an automated deployment step if the NUS server path is mounted consistently.
3. Keep refining the sheet schema as the site content grows.
