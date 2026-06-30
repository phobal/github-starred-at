# Privacy Policy

**GitHub Starred At** is a Chrome extension that shows you the date you starred each of your GitHub repositories. This document explains what data the extension handles, where it is stored, and what it does not do.

## Summary

- Your GitHub personal access token and your list of starred repositories are stored **locally in your browser** (`chrome.storage.local`).
- The extension does not operate any remote backend. There is no analytics service, no telemetry, no third-party tracking, and no advertising.
- The only network requests the extension makes are direct calls from your browser to `api.github.com` to read your starred repositories, using the token you provided.

## Data the extension accesses

| Data | Source | Purpose | Where it is stored |
| --- | --- | --- | --- |
| GitHub personal access token | Entered manually by you in the options page | Authenticating `GET /user/starred` requests to the GitHub API | `chrome.storage.local`, on your device |
| Starred repository list | Fetched from `https://api.github.com/user/starred` | Building the local cache that powers the tooltip and list badge | `chrome.storage.local`, on your device |
| Display options (sync interval, date format) | Entered manually by you in the options page | Configuring the extension | `chrome.storage.local`, on your device |

The extension requests a **fine-grained** token with the **Starring: Read-only** permission. It does not need, and will never use, any other scope. If your token has broader scopes, that is your choice — the extension itself does not require them.

## What the extension does NOT do

- It does not read your source code, issues, pull requests, gists, organizations, or any other GitHub data.
- It does not modify, unstar, or star repositories on your behalf.
- It does not transmit your token or your starred list to any server other than the official GitHub API.
- It does not include analytics, crash reporting, fingerprinting, or any remote logging.
- It does not inject advertisements or affiliate links.
- It does not sell, share, or transfer any data to third parties.

## Where data lives and how to remove it

Everything stays on your machine inside `chrome.storage.local`. You can clear all extension data at any time by one of the following:

- Open the options page and click **Clear cached data**.
- Open `chrome://extensions/`, click **Remove** on the GitHub Starred At card. This deletes the extension and all of its stored data.

Removing the extension also revokes the trust relationship from your side. For belt-and-suspenders cleanup, you can additionally revoke the token at https://github.com/settings/personal-access-tokens.

## Permissions explained

- `alarms` — schedules the periodic background sync of your starred list.
- `storage` — caches your token, options, and the starred-repositories map locally.
- Host permission `https://github.com/*` — runs the content script that injects the tooltip and list badge on GitHub pages.
- Host permission `https://api.github.com/*` — fetches your starred repositories through the official GitHub REST API.

## Changes to this policy

If the extension's data handling changes in a meaningful way, this document will be updated and the change will be summarized at the top with a date. Material changes will also be mentioned in the extension's release notes on the Chrome Web Store listing.

## Contact

If you have questions, want to report a privacy concern, or want to request deletion of any data associated with the extension, please open an issue at:

**https://github.com/phobal/github-starred-at/issues**

Replace this with the actual GitHub user or organization that owns this repository.

## Effective date

This policy is effective as of **2026-06-30**.