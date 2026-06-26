const STORAGE_KEYS = {
  token: "githubToken",
  starredMap: "starredMap",
  syncState: "syncState",
  options: "options"
};

const DEFAULT_OPTIONS = {
  autoSyncHours: 12,
  showRelativeTime: true,
  showAbsoluteDate: true
};

async function getStored(keys) {
  return chrome.storage.local.get(keys);
}

async function setStored(values) {
  return chrome.storage.local.set(values);
}

async function getOptions() {
  const data = await getStored([STORAGE_KEYS.options]);
  return {
    ...DEFAULT_OPTIONS,
    ...(data[STORAGE_KEYS.options] || {})
  };
}

async function getStarredMap() {
  const data = await getStored([STORAGE_KEYS.starredMap]);
  return data[STORAGE_KEYS.starredMap] || {};
}

async function saveStarredMap(starredMap) {
  await setStored({
    [STORAGE_KEYS.starredMap]: starredMap,
    [STORAGE_KEYS.syncState]: {
      status: "success",
      repoCount: Object.keys(starredMap).length,
      lastSyncedAt: new Date().toISOString(),
      error: null
    }
  });
}
