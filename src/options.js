const tokenInput = document.getElementById("token");
const autoSyncHoursInput = document.getElementById("autoSyncHours");
const showRelativeTimeInput = document.getElementById("showRelativeTime");
const showAbsoluteDateInput = document.getElementById("showAbsoluteDate");
const saveButton = document.getElementById("save");
const syncButton = document.getElementById("sync");
const statusEl = document.getElementById("status");
const statusDotEl = document.getElementById("statusDot");
const repoCountEl = document.getElementById("repoCount");
const lastSyncedAtEl = document.getElementById("lastSyncedAt");
const messageEl = document.getElementById("message");

loadState();

saveButton.addEventListener("click", async () => {
  setBusy(true);
  messageEl.textContent = "";

  const response = await chrome.runtime.sendMessage({
    type: "SAVE_OPTIONS",
    token: tokenInput.value.trim(),
    options: readOptionsFromForm()
  });

  setBusy(false);
  messageEl.textContent = response?.ok ? "Settings saved." : "Could not save settings.";
  await loadState();
});

syncButton.addEventListener("click", async () => {
  setBusy(true);
  messageEl.textContent = "Saving settings...";

  const saveResponse = await chrome.runtime.sendMessage({
    type: "SAVE_OPTIONS",
    token: tokenInput.value.trim(),
    options: readOptionsFromForm()
  });

  if (!saveResponse?.ok) {
    setBusy(false);
    messageEl.textContent = "Could not save settings. Sync was not started.";
    return;
  }

  messageEl.textContent = "Syncing your GitHub starred repositories...";

  const response = await chrome.runtime.sendMessage({
    type: "SYNC_STARRED_REPOSITORIES"
  });

  setBusy(false);
  messageEl.textContent = response?.ok
    ? `Sync complete. ${response.repoCount} repositories indexed.`
    : `Sync failed: ${response?.error || "Unknown error"}`;
  await loadState();
});

async function loadState() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.token,
    STORAGE_KEYS.options,
    STORAGE_KEYS.syncState
  ]);
  const options = {
    ...DEFAULT_OPTIONS,
    ...(data[STORAGE_KEYS.options] || {})
  };
  const syncState = data[STORAGE_KEYS.syncState] || {};

  tokenInput.value = data[STORAGE_KEYS.token] || "";
  autoSyncHoursInput.value = options.autoSyncHours;
  showRelativeTimeInput.checked = options.showRelativeTime;
  showAbsoluteDateInput.checked = options.showAbsoluteDate;

  statusEl.textContent = formatStatus(syncState.status);
  updateStatusDot(syncState.status);
  repoCountEl.textContent = String(syncState.repoCount || 0);
  lastSyncedAtEl.textContent = syncState.lastSyncedAt
    ? formatDateTime(syncState.lastSyncedAt)
    : "-";
  messageEl.textContent = syncState.error || "";
}

function readOptionsFromForm() {
  return {
    autoSyncHours: Number(autoSyncHoursInput.value),
    showRelativeTime: showRelativeTimeInput.checked,
    showAbsoluteDate: showAbsoluteDateInput.checked
  };
}

function setBusy(isBusy) {
  saveButton.disabled = isBusy;
  syncButton.disabled = isBusy;
}

function formatStatus(status) {
  if (status === "success") return "Synced";
  if (status === "syncing") return "Syncing";
  if (status === "error") return "Needs attention";
  return "Not synced";
}

function updateStatusDot(status) {
  statusDotEl.className = "status-dot";
  if (status === "success") statusDotEl.classList.add("success");
  if (status === "syncing") statusDotEl.classList.add("syncing");
  if (status === "error") statusDotEl.classList.add("error");
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
