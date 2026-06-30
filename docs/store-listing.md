# Chrome Web Store Listing — GitHub Starred At

> Copy these fields directly into the Chrome Web Store Developer Dashboard.
> Char counts are shown next to each field so you stay within limits.

---

## Product name
**GitHub Starred At** (matches `manifest.json`)

---

## Summary (≤132 chars)
**42 / 132**

> Show when you starred any GitHub repo. Fine-grained PAT, zero backend, fully local.

Alternative (if you want to lead with the feature):

> Hover any GitHub Star button to see exactly when you starred the repo. 100% local.

---

## Description (≤13000 chars)
**~1900 / 13000**

> GitHub Starred At answers a deceptively simple question: **"When did I star this?"**
>
> Hover the Star button on any GitHub repository page and a small, quiet tooltip appears with the exact moment you starred it. Open your `/?tab=stars` list and each repository grows a discreet "Starred at" badge next to its last-updated timestamp. No more scrolling through your entire stars list to remember which of those "useful" repos from 2019 you should actually revisit.
>
> ### Why a fine-grained PAT instead of OAuth?
>
> Most "stars" extensions ask you to install a third-party OAuth app with broad read access to your account. This one does not. You paste a **GitHub fine-grained personal access token** with the single **Starring: Read-only** permission. No OAuth handshake, no third-party app on your account, and the token can only read your starred list — nothing else. Generate one at *github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens*.
>
> ### Features
>
> - **Hover tooltip on the Star button** — shows the starred date as relative time ("2 years ago"), absolute date ("Jun 26, 2024"), or both. Configurable per user.
> - **"Starred at" badge on your stars list** — added to each card on `github.com/?tab=stars`, right next to the existing "Updated" label.
> - **Local-first cache** — your starred list is synced once and cached in `chrome.storage.local`. Tooltips and badges are instant; GitHub's API is not hit on every page view.
> - **Configurable auto-sync** — refreshes in the background on an interval you control (default every 12 hours, range 1–168 hours).
> - **Manual sync button** — one-click refresh from the toolbar popup.
> - **Reacts to client-side navigation** — moving between repositories without a full page reload still updates the tooltip.
>
> ### Privacy, in one sentence
>
> Your token and your starred list stay on your device. The extension does not have a backend, does not run analytics, and does not talk to any third party. The only network calls it makes are direct requests from your browser to `api.github.com`. Full details: https://github.com/phobal/github-starred-at/blob/main/PRIVACY.md
>
> ### How it works
>
> 1. Click the extension icon and paste your GitHub fine-grained token (scope: *Starring*, read-only).
> 2. Hit **Sync now**. The extension paginates `GET /user/starred` once and builds a local map.
> 3. Visit any repo — hover the Star button. Visit `/?tab=stars` — see the badges.
>
> ### Permissions, explained plainly
>
> - `alarms` — schedules the periodic background sync.
> - `storage` — caches your token, options, and starred list locally.
> - Host permission `github.com` — runs the small content script that draws the tooltip and badges.
> - Host permission `api.github.com` — fetches your starred list.
>
> ### Open source
>
> The extension is open source under the MIT license. Read the code, file an issue, or send a patch at https://github.com/phobal/github-starred-at
>
> ### Notes
>
> - Requires Chrome 114 or later (Manifest V3).
> - Requires you to create your own GitHub fine-grained personal access token. The extension cannot do this for you.

---

## Category
**Developer Tools** (primary). Optional secondary: **Productivity**.

---

## Language
**English** (default).

If you later want to add Chinese as a secondary language, translate the Description and Summary fields inside the Dashboard's language switcher.

---

## Single purpose (Privacy tab)
> Display the date a user starred a GitHub repository, by overlaying a hover tooltip on the Star button and adding a "Starred at" badge to the user's stars list. Uses a user-provided fine-grained PAT to read the starred-repositories endpoint of the official GitHub API. No other functionality.

---

## Permissions justification (Privacy tab)

| Permission | Justification |
| --- | --- |
| `alarms` | Used to schedule the periodic background sync of the user's starred repositories at a user-configured interval. |
| `storage` | Used to cache the user's GitHub token, the user's options, and the local map of `owner/repo → starred_at`. No data leaves the device. |
| Host: `https://github.com/*` | Required to inject the content script that detects the Star button on repository pages and the cards on `/?tab=stars`, and to render the tooltip and "Starred at" badge. |
| Host: `https://api.github.com/*` | Required to call `GET /user/starred` (with `Accept: application/vnd.github.star+json`) using the user-provided token, to build the local starred-repositories map. No other API endpoints are called. |

---

## Data usage (Privacy tab)

| Question | Answer |
| --- | --- |
| Does the extension collect or transmit user data to a remote server controlled by the developer? | **No.** |
| Does the extension collect or transmit user data to any third party? | **No**, except for direct calls from the user's browser to `api.github.com` using the user's own token. |
| Is the data used for any purpose unrelated to the extension's single stated purpose? | **No.** |

### Data the extension handles

| Data | Type | Source | Purpose | Stored? |
| --- | --- | --- | --- | --- |
| GitHub personal access token | Auth credential | User-entered in options page | Authenticate `GET /user/starred` | Yes, `chrome.storage.local` |
| List of starred repositories | User activity | Fetched from `api.github.com/user/starred` | Build the local cache that powers the tooltip and badges | Yes, `chrome.storage.local` |
| Display options (sync interval, date format) | User preference | User-entered in options page | Configure the extension | Yes, `chrome.storage.local` |

All stored data is on the user's device. It is not transmitted off-device except as direct requests to `api.github.com` initiated by the user's browser on the user's behalf.

---

## Privacy policy URL
**https://github.com/phobal/github-starred-at/blob/main/PRIVACY.md**

> Replace this with the actual GitHub user or organization that owns the repository before publishing.

---

## Support URL
**https://github.com/phobal/github-starred-at/issues**

---

## Visibility
Start with **Unlisted** if you want to validate the listing before announcing it publicly. Switch to **Public** when ready.

---

## Screenshot checklist (before submitting)

You'll need at least 1 screenshot (1280×800 or 640×400 PNG/JPG). Recommended set:

1. **Repository page with hover tooltip** — most representative single shot. Capture the Star button hovered with the tooltip visible, showing both relative and absolute date.
2. **Stars list with badges** — full `?tab=stars` page showing several "Starred at" badges in context.
3. **Options page** — token field + display settings + status pill ("Synced · N repos").
4. **(Optional) Permissions card** — small screenshot highlighting "fine-grained PAT, no OAuth" as a security talking point.
5. **(Optional) Comparison or "before / after"** — same stars list without and with the badges.

Keep file size ≤ 5 MB each.

---

## Marquee promotional tile (optional but recommended)
- Size: **1400 × 560 PNG/JPG**
- Lead with the extension name and one-line tagline: *"See exactly when you starred any GitHub repo."*
- Show a tight crop of the Star-button tooltip or the stars-list badge.
- Avoid dense text; this image is rendered at thumbnail sizes.

---

## Small promotional tile (optional)
- Size: **440 × 280 PNG**
- Same visual language as the marquee, scaled down.