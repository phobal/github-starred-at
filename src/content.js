const TOOLTIP_CLASS = "github-starred-at-tooltip";
const WRAPPER_CLASS = "github-starred-at-wrapper";
const LIST_BADGE_CLASS = "github-starred-at-list-badge";
const MARKER_ATTRIBUTE = "data-github-starred-at-added";
const LIST_MARKER_ATTRIBUTE = "data-github-starred-at-list-added";

let currentUrl = location.href;
let observer = null;

init();

function init() {
  installStyle();
  renderWhenPossible();
  observeNavigation();
  observeDomChanges();
}

function observeNavigation() {
  setInterval(() => {
    if (currentUrl === location.href) return;
    currentUrl = location.href;
    removeExistingBadges();
    renderWhenPossible();
  }, 600);
}

function observeDomChanges() {
  observer = new MutationObserver(() => {
    renderWhenPossible();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

async function renderWhenPossible() {
  if (isStarsListPage()) {
    await renderStarsListPage();
    return;
  }

  await renderRepositoryPage();
}

async function renderRepositoryPage() {
  const fullName = getRepositoryFullName();
  if (!fullName) return;

  const target = findStarButtonContainer();
  if (!target || target.hasAttribute(MARKER_ATTRIBUTE)) return;

  target.setAttribute(MARKER_ATTRIBUTE, "true");

  const response = await chrome.runtime.sendMessage({
    type: "GET_STARRED_AT",
    fullName
  });

  if (!response?.ok || !response.starredAt) return;
  if (!isRepositoryStarred(target)) return;

  attachTooltip(target, response.starredAt, response.options || {});
}

async function renderStarsListPage() {
  const repositories = findStarsListRepositories();
  if (repositories.length === 0) return;

  const pendingRepositories = repositories.filter(({ container }) => (
    !container.hasAttribute(LIST_MARKER_ATTRIBUTE)
  ));
  if (pendingRepositories.length === 0) return;

  const response = await chrome.runtime.sendMessage({
    type: "GET_STARRED_AT_BATCH",
    fullNames: [...new Set(pendingRepositories.map(({ fullName }) => fullName))]
  });

  if (!response?.ok) return;

  for (const { fullName, container } of pendingRepositories) {
    const starredAt = response.starredAtByFullName?.[fullName];
    if (!starredAt) {
      continue;
    }

    const updatedTime = findUpdatedTimeElement(container);
    if (!updatedTime) continue;

    if (container.querySelector(`.${LIST_BADGE_CLASS}`)) {
      container.setAttribute(LIST_MARKER_ATTRIBUTE, "true");
      continue;
    }

    updatedTime.insertAdjacentElement("afterend", createListBadge(starredAt, response.options || {}));
    container.setAttribute(LIST_MARKER_ATTRIBUTE, "true");
  }
}

function isStarsListPage() {
  return new URLSearchParams(location.search).get("tab") === "stars";
}

function findStarsListRepositories() {
  const frame = document.getElementById("user-starred-repos") || document;
  const cards = [
    ...frame.querySelectorAll([
      "div.col-12.d-block.width-full.border-bottom",
      "div.col-12.d-flex.width-full.border-bottom",
      "div.Box-row"
    ].join(", "))
  ];
  const repositories = [];
  const seen = new Set();

  for (const container of cards) {
    const anchor = findRepositoryTitleAnchor(container);
    if (!anchor) continue;

    const fullName = getFullNameFromAnchor(anchor);
    if (!fullName || seen.has(fullName)) continue;

    seen.add(fullName);
    repositories.push({ fullName, container });
  }

  return repositories;
}

function findRepositoryTitleAnchor(container) {
  return container.querySelector([
    "h3 > a[href^='/']",
    "h2 > a[href^='/']",
    "a[itemprop='name codeRepository'][href^='/']",
    "a[data-hovercard-type='repository'][href^='/']"
  ].join(", "));
}

function getFullNameFromAnchor(anchor) {
  const url = new URL(anchor.getAttribute("href"), location.origin);
  if (url.origin !== location.origin) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  return `${decodeURIComponent(parts[0])}/${decodeURIComponent(parts[1])}`.toLowerCase();
}

function findUpdatedTimeElement(container) {
  for (const relativeTime of container.querySelectorAll("relative-time")) {
    const context = relativeTime.closest(".f6, p, div")?.textContent || relativeTime.parentElement?.textContent || "";
    if (/\bUpdated\b/i.test(context)) {
      return relativeTime;
    }
  }

  return null;
}

function getRepositoryFullName() {
  const match = location.pathname.match(/^\/([^/]+)\/([^/]+)(?:\/|$)/);
  if (!match) return null;

  const owner = decodeURIComponent(match[1]);
  const repo = decodeURIComponent(match[2]);
  if (!owner || !repo || owner === "orgs" || owner === "users") return null;

  return `${owner}/${repo}`.toLowerCase();
}

function findStarButtonContainer() {
  const candidates = [
    document.querySelector("[data-testid='star-button']"),
    document.querySelector("[aria-label*='star this repository' i]"),
    document.querySelector("[aria-label*='unstar this repository' i]"),
    ...document.querySelectorAll("form[action$='/star'], form[action$='/unstar']")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const container = candidate.closest("li, form, div");
    if (container) return container;
  }

  return null;
}

function isRepositoryStarred(target) {
  const text = target.textContent || "";
  const aria = target.getAttribute("aria-label") || "";
  return /starred|unstar/i.test(text) || /unstar/i.test(aria);
}

function attachTooltip(target, starredAt, options) {
  target.classList.add(WRAPPER_CLASS);
  target.setAttribute("title", `Starred at ${formatDateTime(starredAt)}`);

  const tooltip = document.createElement("span");
  tooltip.className = TOOLTIP_CLASS;
  tooltip.setAttribute("role", "tooltip");

  const label = document.createElement("span");
  label.className = "github-starred-at-tooltip-label";
  label.textContent = "Starred";
  tooltip.appendChild(label);

  if (options.showRelativeTime !== false) {
    const relativeTime = document.createElement("relative-time");
    relativeTime.setAttribute("datetime", starredAt);
    relativeTime.textContent = formatDate(starredAt);
    tooltip.appendChild(relativeTime);
  }

  if (options.showAbsoluteDate !== false) {
    const absoluteDate = document.createElement("span");
    absoluteDate.textContent = options.showRelativeTime === false
      ? formatDate(starredAt)
      : ` (${formatDate(starredAt)})`;
    tooltip.appendChild(absoluteDate);
  }

  target.appendChild(tooltip);
}

function createListBadge(starredAt, options) {
  const badge = document.createElement("span");
  badge.className = LIST_BADGE_CLASS;
  badge.title = `Starred at ${formatDateTime(starredAt)}`;

  const label = document.createElement("span");
  label.textContent = "Starred at";
  badge.appendChild(label);

  if (options.showRelativeTime !== false) {
    const relativeTime = document.createElement("relative-time");
    relativeTime.setAttribute("datetime", starredAt);
    relativeTime.textContent = formatDate(starredAt);
    badge.appendChild(relativeTime);
  }

  if (options.showAbsoluteDate !== false) {
    const absoluteDate = document.createElement("span");
    absoluteDate.textContent = options.showRelativeTime === false
      ? formatDate(starredAt)
      : `(${formatDate(starredAt)})`;
    badge.appendChild(absoluteDate);
  }

  return badge;
}

function formatDate(starredAt) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(starredAt));
}

function formatDateTime(starredAt) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(starredAt));
}

function removeExistingBadges() {
  for (const tooltip of document.querySelectorAll(`.${TOOLTIP_CLASS}`)) {
    tooltip.remove();
  }

  for (const badge of document.querySelectorAll(`.${LIST_BADGE_CLASS}`)) {
    badge.remove();
  }

  for (const element of document.querySelectorAll(`[${MARKER_ATTRIBUTE}]`)) {
    element.removeAttribute(MARKER_ATTRIBUTE);
    element.classList.remove(WRAPPER_CLASS);
    element.removeAttribute("title");
  }

  for (const element of document.querySelectorAll(`[${LIST_MARKER_ATTRIBUTE}]`)) {
    element.removeAttribute(LIST_MARKER_ATTRIBUTE);
  }
}

function installStyle() {
  if (document.getElementById("github-starred-at-style")) return;

  const style = document.createElement("style");
  style.id = "github-starred-at-style";
  style.textContent = `
    .${WRAPPER_CLASS} {
      position: relative;
    }

    .${TOOLTIP_CLASS} {
      position: absolute;
      z-index: 100;
      left: 50%;
      bottom: calc(100% + 8px);
      transform: translateX(-50%) translateY(2px);
      display: inline-flex;
      align-items: center;
      gap: 3px;
      width: max-content;
      max-width: min(280px, 80vw);
      border: 1px solid var(--borderColor-default, #d0d7de);
      border-radius: 6px;
      padding: 6px 8px;
      color: var(--fgColor-default, #24292f);
      background: var(--bgColor-default, #ffffff);
      box-shadow: var(--shadow-floating-small, 0 8px 24px rgba(140, 149, 159, 0.2));
      font-size: 12px;
      line-height: 16px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease;
    }

    .${TOOLTIP_CLASS}::after {
      position: absolute;
      left: 50%;
      bottom: -5px;
      width: 8px;
      height: 8px;
      border-right: 1px solid var(--borderColor-default, #d0d7de);
      border-bottom: 1px solid var(--borderColor-default, #d0d7de);
      background: var(--bgColor-default, #ffffff);
      content: "";
      transform: translateX(-50%) rotate(45deg);
    }

    .${WRAPPER_CLASS}:hover .${TOOLTIP_CLASS},
    .${WRAPPER_CLASS}:focus-within .${TOOLTIP_CLASS} {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    .github-starred-at-tooltip-label {
      color: var(--fgColor-muted, #57606a);
    }

    .${LIST_BADGE_CLASS} {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 10px;
      color: var(--fgColor-muted, #57606a);
      font-size: 12px;
      font-weight: 400;
      line-height: 18px;
      white-space: nowrap;
      vertical-align: baseline;
    }
  `;
  document.documentElement.appendChild(style);
}
