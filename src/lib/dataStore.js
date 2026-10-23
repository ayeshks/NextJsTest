import fs from "fs/promises";
import path from "path";
import os from "os";
import { getDb } from "./mongodb";

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
  if (memoryCache[filename]) {
    return memoryCache[filename];
  }

  if (process.env.VERCEL) {
    try {
      const tmpFile = path.join(TMP_DATA_DIR, filename);
      const content = await fs.readFile(tmpFile, "utf-8");
      const parsed = JSON.parse(content);
      memoryCache[filename] = parsed;
      return parsed;
    } catch (_) {}
  }

  try {
    const bundledFile = path.join(BUNDLED_DIR, filename);
    const content = await fs.readFile(bundledFile, "utf-8");
    const parsed = JSON.parse(content);
    memoryCache[filename] = parsed;
    return parsed;
  } catch (error) {
    memoryCache[filename] = defaultData;
    return defaultData;
  }
}

export async function writeJson(filename, data) {
  memoryCache[filename] = data;

  if (!process.env.VERCEL) {
    try {
      await fs.mkdir(BUNDLED_DIR, { recursive: true });
      const filePath = path.join(BUNDLED_DIR, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (localErr) {
      console.warn(`Local write error for ${filename}:`, localErr.message);
    }
  }

  try {
    await fs.mkdir(TMP_DATA_DIR, { recursive: true });
    const tmpFile = path.join(TMP_DATA_DIR, filename);
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (tmpErr) {
    return true;
  }
}

// ----------------------------------------------------
// MONGODB ATLAS COLLECTION HELPERS (WITH AUTO SEEDING)
// ----------------------------------------------------

async function getCollectionWithSeed(collectionName, jsonFilename) {
  const db = await getDb();
  if (!db) return null;

  try {
    const col = db.collection(collectionName);
    const count = await col.countDocuments();
    if (count === 0) {
      const initialData = await readJson(jsonFilename, []);
      if (Array.isArray(initialData) && initialData.length > 0) {
        // Clone items to avoid mutability issues
        const cleanDocs = initialData.map((d) => ({ ...d }));
        await col.insertMany(cleanDocs);
        console.log(`Seeded MongoDB Atlas collection "${collectionName}" with ${cleanDocs.length} records.`);
      }
    }
    return col;
  } catch (err) {
    console.warn(`MongoDB collection "${collectionName}" access error:`, err.message);
    return null;
  }
}

// ----------------------------------------------------
// ACCOUNTS (PROFILES)
// ----------------------------------------------------
export async function getAccounts() {
  const col = await getCollectionWithSeed("accounts", "accounts.json");
  if (col) {
    try {
      const docs = await col.find({}).toArray();
      // Remove Mongo _id before returning
      const clean = docs.map(({ _id, ...rest }) => rest);
      memoryCache["accounts.json"] = clean;
      return clean;
    } catch (err) {
      console.warn("MongoDB getAccounts error:", err.message);
    }
  }
  return readJson("accounts.json", []);
}

export async function saveAccount(accountData) {
  const accounts = await getAccounts();
  const existing = accounts.find(
    (a) =>
      a.id === accountData.id ||
      (a.alias || a.name || "").toLowerCase() ===
        (accountData.alias || accountData.name || "").toLowerCase()
  );

  if (existing) {
    if (accountData.color && existing.color !== accountData.color) {
      existing.color = accountData.color;
      const col = await getCollectionWithSeed("accounts", "accounts.json");
      if (col) {
        try {
          await col.updateOne({ id: existing.id }, { $set: { color: accountData.color } });
        } catch (err) {
          console.warn("MongoDB color update error:", err.message);
        }
      }
      await writeJson("accounts.json", accounts);
    }
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

  const col = await getCollectionWithSeed("accounts", "accounts.json");
  if (col) {
    try {
      await col.insertOne({ ...newAccount });
    } catch (err) {
      console.warn("MongoDB saveAccount error:", err.message);
    }
  }

  accounts.push(newAccount);
  await writeJson("accounts.json", accounts);
  return newAccount;
}

// ----------------------------------------------------
// VIP CHAT
// ----------------------------------------------------
export async function getChatMessages() {
  let messages = [];
  const col = await getCollectionWithSeed("chat", "chat.json");
  if (col) {
    try {
      const docs = await col.find({}).sort({ createdAt: 1 }).toArray();
      messages = docs.map(({ _id, ...rest }) => rest);
    } catch (err) {
      console.warn("MongoDB getChatMessages error:", err.message);
      messages = await readJson("chat.json", []);
    }
  } else {
    messages = await readJson("chat.json", []);
  }

  const accounts = await getAccounts();
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
  const accounts = await getAccounts();
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

  const col = await getCollectionWithSeed("chat", "chat.json");
  if (col) {
    try {
      await col.insertOne({ ...newMsg });
    } catch (err) {
      console.warn("MongoDB addChatMessage error:", err.message);
    }
  }

  const messages = await readJson("chat.json", []);
  messages.push(newMsg);
  await writeJson("chat.json", messages);

  return {
    ...newMsg,
    account: resolvedAccount,
  };
}

// ----------------------------------------------------
// CHECKLIST (ITEMS)
// ----------------------------------------------------
export async function getItems() {
  const col = await getCollectionWithSeed("items", "items.json");
  if (col) {
    try {
      const docs = await col.find({}).toArray();
      const clean = docs.map(({ _id, ...rest }) => rest);
      memoryCache["items.json"] = clean;
      return clean;
    } catch (err) {
      console.warn("MongoDB getItems error:", err.message);
    }
  }
  return readJson("items.json", []);
}

export async function updateItemClaim(itemId, { claimedBy, claimedAccountId, status }) {
  const items = await getItems();
  const index = items.findIndex((i) => String(i.id) === String(itemId));
  if (index === -1) return null;

  const updatedItem = {
    ...items[index],
    status: status !== undefined ? status : !items[index].status,
    claimedBy: status === false ? "" : claimedBy || items[index].claimedBy,
    claimedAccountId: status === false ? null : claimedAccountId || items[index].claimedAccountId,
  };

  const col = await getCollectionWithSeed("items", "items.json");
  if (col) {
    try {
      await col.updateOne(
        { id: String(itemId) },
        {
          $set: {
            status: updatedItem.status,
            claimedBy: updatedItem.claimedBy,
            claimedAccountId: updatedItem.claimedAccountId,
          },
        }
      );
    } catch (err) {
      console.warn("MongoDB updateItemClaim error:", err.message);
    }
  }

  items[index] = updatedItem;
  await writeJson("items.json", items);
  return updatedItem;
}

export async function addCustomItem({ name, category = "Custom" }) {
  const newItem = {
    id: String(Date.now()),
    name,
    category,
    claimedBy: "",
    claimedAccountId: null,
    status: false,
  };

  const col = await getCollectionWithSeed("items", "items.json");
  if (col) {
    try {
      await col.insertOne({ ...newItem });
    } catch (err) {
      console.warn("MongoDB addCustomItem error:", err.message);
    }
  }

  const items = await getItems();
  items.push(newItem);
  await writeJson("items.json", items);
  return newItem;
}

export async function deleteItem(itemId) {
  const col = await getCollectionWithSeed("items", "items.json");
  if (col) {
    try {
      await col.deleteOne({ id: String(itemId) });
    } catch (err) {
      console.warn("MongoDB deleteItem error:", err.message);
    }
  }

  const items = await getItems();
  const filtered = items.filter((i) => String(i.id) !== String(itemId));
  await writeJson("items.json", filtered);
  return true;
}

// ----------------------------------------------------
// ATTENDEES (GUESTLIST)
// ----------------------------------------------------
export async function getAttendees() {
  const col = await getCollectionWithSeed("attendees", "attendees.json");
  if (col) {
    try {
      const docs = await col.find({}).toArray();
      const clean = docs.map(({ _id, ...rest }) => rest);
      memoryCache["attendees.json"] = clean;
      return clean;
    } catch (err) {
      console.warn("MongoDB getAttendees error:", err.message);
    }
  }
  return readJson("attendees.json", []);
}

export async function addAttendee({ name, status, accountId }) {
  const now = new Date();
  const timeStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const newAttendee = {
    id: `att-${Date.now()}`,
    accountId: accountId || null,
    name,
    status: status || "Confirmed Guest",
    time: timeStr,
  };

  const col = await getCollectionWithSeed("attendees", "attendees.json");
  if (col) {
    try {
      await col.insertOne({ ...newAttendee });
    } catch (err) {
      console.warn("MongoDB addAttendee error:", err.message);
    }
  }

  const attendees = await getAttendees();
  attendees.push(newAttendee);
  await writeJson("attendees.json", attendees);
  return newAttendee;
}

export async function deleteAttendee(id) {
  const col = await getCollectionWithSeed("attendees", "attendees.json");
  if (col) {
    try {
      await col.deleteOne({ id: String(id) });
    } catch (err) {
      console.warn("MongoDB deleteAttendee error:", err.message);
    }
  }

  const attendees = await getAttendees();
  const filtered = attendees.filter((a) => String(a.id) !== String(id));
  await writeJson("attendees.json", filtered);
  return true;
}

// ----------------------------------------------------
// YOUTUBE DJ TRACKS
// ----------------------------------------------------
export async function getYoutubeTracks() {
  const col = await getCollectionWithSeed("youtube_tracks", "youtube_tracks.json");
  if (col) {
    try {
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      const clean = docs.map(({ _id, ...rest }) => rest);
      memoryCache["youtube_tracks.json"] = clean;
      return clean;
    } catch (err) {
      console.warn("MongoDB getYoutubeTracks error:", err.message);
    }
  }
  return readJson("youtube_tracks.json", []);
}

export async function saveYoutubeTrack(trackData) {
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

  const col = await getCollectionWithSeed("youtube_tracks", "youtube_tracks.json");
  if (col) {
    try {
      await col.updateOne(
        { $or: [{ url: newTrack.url }, { videoId: newTrack.videoId }] },
        { $set: newTrack },
        { upsert: true }
      );
    } catch (err) {
      console.warn("MongoDB saveYoutubeTrack error:", err.message);
    }
  }

  const tracks = await readJson("youtube_tracks.json", []);
  const existingIndex = tracks.findIndex(
    (t) => t.url === newTrack.url || (newTrack.videoId && t.videoId === newTrack.videoId)
  );

  if (existingIndex >= 0) {
    tracks[existingIndex] = { ...tracks[existingIndex], ...newTrack };
  } else {
    tracks.unshift(newTrack);
  }

  await writeJson("youtube_tracks.json", tracks);
  return newTrack;
}

export async function deleteYoutubeTrack(id) {
  const col = await getCollectionWithSeed("youtube_tracks", "youtube_tracks.json");
  if (col) {
    try {
      await col.deleteOne({ id: String(id) });
    } catch (err) {
      console.warn("MongoDB deleteYoutubeTrack error:", err.message);
    }
  }

  const tracks = await getYoutubeTracks();
  const filtered = tracks.filter((t) => String(t.id) !== String(id));
  await writeJson("youtube_tracks.json", filtered);
  return true;
}
