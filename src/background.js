importScripts("storage.js");

const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_STAR_ACCEPT = "application/vnd.github.star+json";
const SYNC_ALARM_NAME = "sync-starred-repositories";

chrome.runtime.onInstalled.addListener(async () => {
  const options = await getOptions();
  chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: options.autoSyncHours * 60
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== SYNC_ALARM_NAME) return;
  await syncStarredRepositories();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_STARRED_AT") {
    handleGetStarredAt(message.fullName).then(sendResponse);
    return true;
  }

  if (message?.type === "GET_STARRED_AT_BATCH") {
    handleGetStarredAtBatch(message.fullNames).then(sendResponse);
    return true;
  }

  if (message?.type === "SYNC_STARRED_REPOSITORIES") {
    syncStarredRepositories().then(sendResponse);
    return true;
  }

  if (message?.type === "SAVE_OPTIONS") {
    saveOptions(message).then(sendResponse);
    return true;
  }

  return false;
});

async function handleGetStarredAt(fullName) {
  if (!fullName) {
    return { ok: false, error: "Repository full name is missing." };
  }

  const [starredMap, options] = await Promise.all([getStarredMap(), getOptions()]);
  return {
    ok: true,
    starredAt: starredMap[fullName.toLowerCase()] || null,
    options
  };
}

async function handleGetStarredAtBatch(fullNames) {
  if (!Array.isArray(fullNames) || fullNames.length === 0) {
    return { ok: true, starredAtByFullName: {}, options: await getOptions() };
  }

  const [starredMap, options] = await Promise.all([getStarredMap(), getOptions()]);
  const starredAtByFullName = {};

  for (const fullName of fullNames) {
    if (typeof fullName !== "string") continue;
    const normalized = fullName.toLowerCase();
    if (starredMap[normalized]) {
      starredAtByFullName[normalized] = starredMap[normalized];
    }
  }

  return {
    ok: true,
    starredAtByFullName,
    options
  };
}

async function saveOptions(message) {
  const options = {
    autoSyncHours: Number(message.options?.autoSyncHours) || DEFAULT_OPTIONS.autoSyncHours,
    showRelativeTime: Boolean(message.options?.showRelativeTime),
    showAbsoluteDate: Boolean(message.options?.showAbsoluteDate)
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.options]: options,
    [STORAGE_KEYS.token]: message.token || ""
  });

  chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: options.autoSyncHours * 60
  });

  return { ok: true };
}

async function syncStarredRepositories() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.token]);
  const token = data[STORAGE_KEYS.token];

  if (!token) {
    const syncState = {
      status: "error",
      repoCount: 0,
      lastSyncedAt: null,
      error: "GitHub token is not configured."
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.syncState]: syncState });
    return { ok: false, error: syncState.error };
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.syncState]: {
      status: "syncing",
      repoCount: 0,
      lastSyncedAt: null,
      error: null
    }
  });

  try {
    const starredMap = await fetchAllStarredRepositories(token);
    await saveStarredMap(starredMap);
    return {
      ok: true,
      repoCount: Object.keys(starredMap).length
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await chrome.storage.local.set({
      [STORAGE_KEYS.syncState]: {
        status: "error",
        repoCount: 0,
        lastSyncedAt: null,
        error: message
      }
    });
    return { ok: false, error: message };
  }
}

async function fetchAllStarredRepositories(token) {
  const starredMap = {};
  let page = 1;

  while (true) {
    const url = new URL("https://api.github.com/user/starred");
    url.searchParams.set("sort", "created");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: GITHUB_STAR_ACCEPT,
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION
      }
    });

    if (!response.ok) {
      throw new Error(await formatGitHubError(response));
    }

    const items = await response.json();
    for (const item of items) {
      const fullName = item?.repo?.full_name;
      const starredAt = item?.starred_at;
      if (fullName && starredAt) {
        starredMap[fullName.toLowerCase()] = starredAt;
      }
    }

    if (items.length < 100) break;
    page += 1;
  }

  return starredMap;
}

async function formatGitHubError(response) {
  let bodyMessage = "";
  try {
    const body = await response.json();
    bodyMessage = body?.message ? `: ${body.message}` : "";
  } catch {
    bodyMessage = "";
  }

  if (response.status === 401) {
    return `GitHub API returned 401 Unauthorized${bodyMessage}`;
  }

  if (response.status === 403) {
    return `GitHub API returned 403 Forbidden${bodyMessage}`;
  }

  return `GitHub API returned ${response.status}${bodyMessage}`;
}
