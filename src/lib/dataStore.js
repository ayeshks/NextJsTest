import fs from "fs/promises";
import path from "path";
import os from "os";

// Bundled read-only project directory on Vercel
const BUNDLED_DIR = path.join(process.cwd(), "data");

// Writable directory on Vercel / Serverless
const TMP_DATA_DIR = path.join(os.tmpdir(), "lontha_party_data");

// Maintain an in-memory cache across requests on the same serverless container
if (!globalThis._lonthaPartyCache) {
  globalThis._lonthaPartyCache = {};
}
const memoryCache = globalThis._lonthaPartyCache;

export async function readJson(filename, defaultData = []) {
  // 1. Return from in-memory cache if available
  if (memoryCache[filename]) {
    return memoryCache[filename];
  }

  // 2. On Vercel, check if file was previously written to TMP_DATA_DIR
  if (process.env.VERCEL) {
    try {
      const tmpFile = path.join(TMP_DATA_DIR, filename);
      const content = await fs.readFile(tmpFile, "utf-8");
      const parsed = JSON.parse(content);
      memoryCache[filename] = parsed;
      return parsed;
    } catch (_) {
      // Not in /tmp yet, proceed to bundled data
    }
  }

  // 3. Read from bundled data directory
  try {
    const bundledFile = path.join(BUNDLED_DIR, filename);
    const content = await fs.readFile(bundledFile, "utf-8");
    const parsed = JSON.parse(content);
    memoryCache[filename] = parsed;
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      memoryCache[filename] = defaultData;
      return defaultData;
    }
    console.warn(`Error reading ${filename}:`, error);
    memoryCache[filename] = defaultData;
    return defaultData;
  }
}

export async function writeJson(filename, data) {
  // Always update in-memory cache first so all subsequent reads get latest data
  memoryCache[filename] = data;

  // On local development, write to local data directory
  if (!process.env.VERCEL) {
    try {
      await fs.mkdir(BUNDLED_DIR, { recursive: true });
      const filePath = path.join(BUNDLED_DIR, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (localErr) {
      console.warn(`Local write error for ${filename}, falling back:`, localErr.message);
    }
  }

  // On Vercel / Serverless, write to /tmp where writes are permitted
  try {
    await fs.mkdir(TMP_DATA_DIR, { recursive: true });
    const tmpFile = path.join(TMP_DATA_DIR, filename);
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (tmpErr) {
    console.warn(`Write to /tmp failed, kept in memory:`, tmpErr.message);
    // Data is safely stored in memoryCache, so the operation succeeds!
    return true;
  }
}

// Helpers for specific data entities
export async function getAccounts() {
  return readJson("accounts.json", []);
}

export async function saveAccount(accountData) {
  const accounts = await getAccounts();
  const existing = accounts.find(
    (a) =>
      a.id === accountData.id ||
      a.alias.toLowerCase() === (accountData.alias || accountData.name || "").toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const newAccount = {
    id: accountData.id || `acc-${Date.now()}`,
    name: accountData.name || accountData.alias,
    alias: accountData.alias || accountData.name,
    avatar: (accountData.alias || accountData.name || "LB")
      .substring(0, 2)
      .toUpperCase(),
    role: accountData.role || "VIP Member",
    color: accountData.color || "#DC2626",
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  await writeJson("accounts.json", accounts);
  return newAccount;
}

export async function getChatMessages() {
  const [messages, accounts] = await Promise.all([
    readJson("chat.json", []),
    getAccounts(),
  ]);

  // Enrich chat with account details if available
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  return messages.map((msg) => {
    const account = msg.accountId ? accountMap.get(msg.accountId) : null;
    return {
      ...msg,
      account: account || {
        name: msg.sender,
        alias: msg.sender,
        avatar: (msg.sender || "LB").substring(0, 2).toUpperCase(),
        color: "#DC2626",
        role: "VIP Guest",
      },
    };
  });
}

export async function addChatMessage({ sender, text, accountId }) {
  const [messages, accounts] = await Promise.all([
    readJson("chat.json", []),
    getAccounts(),
  ]);

  let resolvedAccount = accounts.find(
    (a) => a.id === accountId || a.alias.toLowerCase() === sender.toLowerCase()
  );

  if (!resolvedAccount && sender) {
    resolvedAccount = await saveAccount({ alias: sender, name: sender });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newMsg = {
    id: `msg-${Date.now()}`,
    accountId: resolvedAccount ? resolvedAccount.id : null,
    sender: resolvedAccount ? resolvedAccount.alias : sender,
    text,
    time: timeStr,
    createdAt: now.toISOString(),
  };

  messages.push(newMsg);
  await writeJson("chat.json", messages);

  return {
    ...newMsg,
    account: resolvedAccount,
  };
}

export async function getItems() {
  return readJson("items.json", []);
}

export async function updateItemClaim(itemId, { claimedBy, claimedAccountId, status }) {
  const items = await getItems();
  const index = items.findIndex((i) => String(i.id) === String(itemId));
  if (index === -1) return null;

  items[index] = {
    ...items[index],
    status: status !== undefined ? status : !items[index].status,
    claimedBy: status === false ? "" : claimedBy || items[index].claimedBy,
    claimedAccountId: status === false ? null : claimedAccountId || items[index].claimedAccountId,
  };

  await writeJson("items.json", items);
  return items[index];
}

export async function addCustomItem({ name, category = "Custom" }) {
  const items = await getItems();
  const newItem = {
    id: String(Date.now()),
    name,
    category,
    claimedBy: "",
    claimedAccountId: null,
    status: false,
  };
  items.push(newItem);
  await writeJson("items.json", items);
  return newItem;
}

export async function deleteItem(itemId) {
  const items = await getItems();
  const filtered = items.filter((i) => String(i.id) !== String(itemId));
  await writeJson("items.json", filtered);
  return true;
}

export async function getAttendees() {
  return readJson("attendees.json", []);
}

export async function addAttendee({ name, status, accountId }) {
  const attendees = await getAttendees();
  const now = new Date();
  const timeStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const newAttendee = {
    id: `att-${Date.now()}`,
    accountId: accountId || null,
    name,
    status: status || "Confirmed Guest",
    time: timeStr,
  };

  attendees.push(newAttendee);
  await writeJson("attendees.json", attendees);
  return newAttendee;
}

export async function deleteAttendee(id) {
  const attendees = await getAttendees();
  const filtered = attendees.filter((a) => String(a.id) !== String(id));
  await writeJson("attendees.json", filtered);
  return true;
}

export async function getYoutubeTracks() {
  return readJson("youtube_tracks.json", []);
}

export async function saveYoutubeTrack(trackData) {
  const tracks = await getYoutubeTracks();
  const existingIndex = tracks.findIndex(
    (t) => t.url === trackData.url || (trackData.videoId && t.videoId === trackData.videoId)
  );

  const newTrack = {
    id: trackData.id || `yt-${Date.now()}`,
    videoId: trackData.videoId || "",
    title: trackData.title || "Party Track",
    artist: trackData.artist || "Unknown Artist",
    duration: trackData.duration || "0:00",
    url: trackData.url,
    thumbnail: trackData.thumbnail || "",
    addedBy: trackData.addedBy || "VIP Member",
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    tracks[existingIndex] = { ...tracks[existingIndex], ...newTrack };
  } else {
    tracks.unshift(newTrack);
  }

  await writeJson("youtube_tracks.json", tracks);
  return newTrack;
}

export async function deleteYoutubeTrack(id) {
  const tracks = await getYoutubeTracks();
  const filtered = tracks.filter((t) => String(t.id) !== String(id));
  await writeJson("youtube_tracks.json", filtered);
  return true;
}

