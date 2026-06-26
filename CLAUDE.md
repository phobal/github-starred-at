# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Chrome Manifest V3 extension that displays when you starred a GitHub repository:

- On a repository page, a hover tooltip on the Star button shows the starred date (relative + absolute, configurable).
- On `https://github.com/?tab=stars`, a "Starred at" badge is inserted next to each repo's "Updated" timestamp.
- Data comes from a background sync of `GET /user/starred` using the user's fine-grained PAT (scope: Starring, read-only). Results are cached in `chrome.storage.local` and refreshed on a `chrome.alarms` schedule.

No build system, no bundler, no test framework, no linter — plain JS loaded directly by Chrome.

## Development commands

There is no build, lint, or test step. The full dev loop is:

1. **Load the extension**: open `chrome://extensions/`, enable Developer mode, click **Load unpacked**, select the project root (the directory containing `manifest.json`).
2. **Reload after edits**: on `chrome://extensions/`, click the refresh icon on the extension card. `manifest.json` changes require a full reload; JS/CSS/HTML changes are picked up on the next page load.
3. **Open the options / popup**: click the toolbar icon, or right-click the toolbar icon → Options.
4. **Inspect the content script**: DevTools on any `github.com` page → Sources → Content scripts → `content.js`.
5. **Inspect the service worker**: `chrome://extensions/` → service worker link on the extension card (opens a dedicated DevTools window).
6. **Tail service-worker logs**: service workers sleep when idle; use the DevTools link above or `chrome.alarms` triggers. Foreground `console.log` from the SW shows in that DevTools window.

## Architecture

Three contexts, communicating via `chrome.runtime.sendMessage` and shared `chrome.storage.local`:

```
┌─────────────────┐   GET_STARRED_AT     ┌──────────────────┐
│   content.js    │ ───────────────────► │   background.js  │
│ (github.com/*)  │ ◄─────response────── │ (service worker) │
│  - DOM probe    │                      │  - message router│
│  - tooltip      │                      │  - sync logic    │
│  - list badge   │                      │  - chrome.alarms │
└─────────────────┘                      └──────────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │   storage.js     │
                                         │ (imported by SW  │
                                         │  + referenced by │
                                         │  options page)   │
                                         │  STORAGE_KEYS,   │
                                         │  DEFAULT_OPTIONS │
                                         └──────────────────┘
                                                  ▲
                                                  │
                                         ┌──────────────────┐
                                         │   options.{html, │
                                         │   css,js}        │
                                         │ (popup / options │
                                         │  page)           │
                                         └──────────────────┘
```

### File responsibilities

- **`manifest.json`** — MV3 manifest. Declares `alarms` + `storage` permissions, host permissions for `github.com` and `api.github.com`, content script on `https://github.com/*` injected at `document_idle`, and the options page (also used as the toolbar popup). Top-level `icons` covers the chrome://extensions page and Chrome Web Store; `action.default_icon` covers the toolbar.
- **`src/background.js`** — Service worker. Single `onMessage` listener routes four message types: `GET_STARRED_AT`, `GET_STARRED_AT_BATCH`, `SYNC_STARRED_REPOSITORIES`, `SAVE_OPTIONS`. Owns the periodic `chrome.alarms` alarm and the paginated `fetchAllStarredRepositories` walk (sort=created, direction=desc, per_page=100, requests the `application/vnd.github.star+json` accept type and `X-GitHub-Api-Version: 2026-03-10`).
- **`src/storage.js`** — Shared module imported by `background.js` via `importScripts` and loaded as a `<script>` in `options.html`. Exports `STORAGE_KEYS`, `DEFAULT_OPTIONS`, and the `getStored` / `setStored` / `getOptions` / `getStarredMap` / `saveStarredMap` helpers. Keys live in `chrome.storage.local`.
- **`src/content.js`** — Injected at `document_idle` on every GitHub page. Discovers the current view (`isStarsListPage` vs repo page), probes the DOM for the star button / list cards, asks the SW for starred timestamps, and renders the tooltip or badge. Uses a `MutationObserver` plus a 600 ms `setInterval` URL poll to handle GitHub's client-side navigation. Uses marker attributes (`data-github-starred-at-added`, `data-github-starred-at-list-added`) to avoid double-insertion. Injects its own CSS (the `github-starred-at-style` style tag) — there is no separate stylesheet file.
- **`src/options.html` + `options.css` + `options.js`** — Both the toolbar popup and the `options_ui` page. The page is intentionally light-themed only (`color-scheme: light`). `options.js` only reads the form, sends `SAVE_OPTIONS` / `SYNC_STARRED_REPOSITORIES` to the SW, and re-renders the status pill + counters from `chrome.storage.local`.

### Message protocol (background ↔ content / options)

| `message.type`       | Direction            | Payload                          | Response                                  |
| -------------------- | -------------------- | -------------------------------- | ----------------------------------------- |
| `GET_STARRED_AT`     | content → background | `{ fullName }`                   | `{ ok, starredAt, options }`              |
| `GET_STARRED_AT_BATCH` | content → background | `{ fullNames[] }`              | `{ ok, starredAtByFullName, options }`    |
| `SYNC_STARRED_REPOSITORIES` | options → background | (none)                      | `{ ok, repoCount?, error? }`              |
| `SAVE_OPTIONS`       | options → background | `{ token, options }`             | `{ ok }`                                  |

All four return `true` from the listener so Chrome keeps the message channel open for the async `sendResponse`.

### Sync flow

`chrome.runtime.onInstalled` (re)creates an alarm with `periodInMinutes = autoSyncHours * 60`. The alarm and the manual "Sync now" button both call `syncStarredRepositories`, which:

1. Reads the token from storage; if missing, writes a `syncState` with `status: "error"` and a clear message.
2. Writes a `syncing` state, then paginates `/user/starred` into a `{ "<owner>/<repo>" (lowercased): ISO timestamp }` map, then calls `saveStarredMap` (in `storage.js`) which writes the map plus a `success` syncState.

### Options page

`options.html` loads `storage.js` and `options.js` as plain `<script>` tags (no modules). The popup is the same page as the options page — both target the same `default_popup`/`options_page`. `setBusy(true)` disables the Save and Sync buttons while the SW responds.

## Conventions

- **No bundler, no transpilation.** All files are plain ES2020+ JS. `storage.js` must stay usable both as a service-worker module (`importScripts`) and a regular `<script>` (defines globals on `self`/window).
- **Storage keys** all live in `STORAGE_KEYS` (`githubToken`, `starredMap`, `syncState`, `options`). Don't introduce new keys outside that constant.
- **Repository identifiers** are always stored as `owner/repo` lowercased. Match against them lowercased on read.
- **DOM selectors** in `content.js` are tolerant — they probe multiple selectors (e.g. `[data-testid='star-button']`, `[aria-label*='star this repository' i]`, `form[action$='/star']`) because GitHub's UI changes frequently. When adding new probes, fall back rather than replace, and always set a marker attribute to avoid duplicate insertions.
- **GitHub API errors** are translated by `formatGitHubError` into human-readable strings; that string is what the user sees in the status pill.
- **Icons must be PNG.** Chrome MV3 rejects SVG in `manifest.json` `icons` / `action.default_icon` (security + raster use). If exporting new icons, use a transparent background with no rounded-rect mask — Chrome applies its own toolbar mask and a pre-rounded PNG will look pinched.

## Common tasks

- **Bumping the API version**: change `GITHUB_API_VERSION` in `background.js`. The `Accept: application/vnd.github.star+json` header is what makes GitHub include the `starred_at` timestamp; do not remove it.
- **Adding a new option**: add it to `DEFAULT_OPTIONS` in `storage.js`, add a form control in `options.html` and a reader in `options.js` (`readOptionsFromForm` + `loadState`), then read it from `getOptions()` in `background.js` and pass it through the relevant `GET_STARRED_AT*` response.
- **Adding a new GitHub page type**: extend `renderWhenPossible` in `content.js`, add a new `find…` DOM probe, and always send `GET_STARRED_AT_BATCH` (not single) when you have more than one element on the page — the SW has the lookup already, batching avoids redundant message passing.
- **Adding icons**: replace files in `icons/` keeping the existing filenames (`png_icon-16.png` … `png_icon-256.png`). The `manifest.json` already references all five sizes.