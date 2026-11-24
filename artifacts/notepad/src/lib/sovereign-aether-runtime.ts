/**
 * Copyright © 2026 Viper Studios Technologies. All Rights Reserved.
 * Built with AetherPrime (.ae) & AIR IR (.air) — Permanent Studio Rule 64
 *
 * Sovereign On-Device Vault + 24/7 Oracle Cloud Aether/Aria AI & Neural Voice Engine
 * Ported directly from Viper Studios Religious Studio (lds-15-minute-talks) voice architecture:
 * - WebAudio 1.35x GainNode + sentence-chunked neural MP3 prefetch (Aether & Aria)
 * - Strict half-duplex microphone lock (mic never hears speaker output)
 * - Zero robotic browser speechSynthesis fallback
 * - Clean draft extractor & live stationery typewriter bridge
 */

export type CompanionId = "aether" | "aria";
export type NoteTextAlign = "left" | "center" | "right";

export interface StoredNoteRecord {
  id: number;
  title: string;
  content: string;
  category: string;
  paperTheme: string;
  lineStyle: string;
  inkColor: string;
  font: string;
  textAlign?: NoteTextAlign;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessageRecord {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface StoredConversationRecord {
  id: number;
  noteId?: number;
  title: string;
  createdAt: string;
}

const DB_NAME = "viper_my_ai_notebook_vault_v1";
const DB_VERSION = 1;
const LS_NOTES_MIRROR = "viper_my_ai_notebook_notes_mirror_v1";

const AETHER_STREAM_ENDPOINTS = [
  "https://lds.viperstudiostechnologies.com/api/aether-bridge/gospel-studio",
  "https://aether.viperstudiostechnologies.com/api/aether-bridge/gospel-studio",
];

const AETHER_ASSIST_ENDPOINTS = [
  "https://aether.viperstudiostechnologies.com/api/aether-bridge/notebook-assist",
  "https://lds.viperstudiostechnologies.com/api/aether-bridge/notebook-assist",
];

const AETHER_VOICE_ENDPOINTS = [
  "https://lds.viperstudiostechnologies.com/api/aether-bridge/gospel-voice",
  "https://aether.viperstudiostechnologies.com/api/aether-bridge/gospel-voice",
];

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("conversations")) {
        db.createObjectStore("conversations", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openVaultDb();
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (storeName === "notes") {
      try {
        const raw = localStorage.getItem(LS_NOTES_MIRROR);
        if (raw) return JSON.parse(raw) as T[];
      } catch {
        /* ignore */
      }
    }
    return [];
  }
}

async function idbPut<T>(storeName: string, record: T): Promise<T> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* fallback mirror handled below */
  }
  if (storeName === "notes") {
    try {
      const all = await idbGetAll<StoredNoteRecord>("notes");
      localStorage.setItem(LS_NOTES_MIRROR, JSON.stringify(all));
    } catch {
      /* ignore quota if huge inline photos */
    }
  }
  return record;
}

async function idbDelete(storeName: string, id: number): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
  if (storeName === "notes") {
    try {
      const all = await idbGetAll<StoredNoteRecord>("notes");
      localStorage.setItem(LS_NOTES_MIRROR, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }
}

let _nextIdCounter = Date.now();
function nextId(): number {
  _nextIdCounter += 1;
  return _nextIdCounter;
}

export function stripHtmlForAiContext(html: string): string {
  if (!html) return "";
  const tmp = typeof document !== "undefined" ? document.createElement("div") : null;
  if (!tmp) return html.replace(/<[^>]+>/g, " ").trim();
  tmp.innerHTML = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  return (tmp.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function getNoteSnapshotById(noteId: number): Promise<StoredNoteRecord | null> {
  const notes = await idbGetAll<StoredNoteRecord>("notes");
  return notes.find((n) => Number(n.id) === Number(noteId)) ?? null;
}

// ── Local WASM OCR Loader for Scan-to-Text (`⛶ Scan` button) ──
let _tesseractPromise: Promise<unknown> | null = null;
async function runLocalImageOcr(base64: string, mimeType: string): Promise<string> {
  if (typeof window === "undefined") return "";
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64}`;

  // Load Tesseract.js v5 on demand if not yet loaded
  const win = window as unknown as {
    Tesseract?: { recognize: (img: string, lang: string) => Promise<{ data?: { text?: string } }> };
  };
  if (!win.Tesseract) {
    if (!_tesseractPromise) {
      _tesseractPromise = new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("OCR engine load failed"));
        document.head.appendChild(s);
      });
    }
    try {
      await _tesseractPromise;
    } catch {
      _tesseractPromise = null;
      return "";
    }
  }
  if (win.Tesseract) {
    const out = await win.Tesseract.recognize(dataUrl, "eng");
    return String(out?.data?.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return "";
}

export async function handleSovereignLocalApi(
  rawUrl: string,
  method: string,
  rawBody?: BodyInit | null,
): Promise<unknown> {
  const cleanUrl = rawUrl.replace(/^https?:\/\/[^/]+/i, "").split("?")[0];
  const m = method.toUpperCase();
  const bodyObj =
    typeof rawBody === "string" && rawBody.trim().startsWith("{")
      ? JSON.parse(rawBody)
      : {};

  // 1. Pro Entitlement — 100% Unlocked (Paid App / Sovereign Edition)
  if (cleanUrl.endsWith("/api/me") && m === "GET") {
    return { isPro: true };
  }
  if (cleanUrl.endsWith("/api/pro/redeem") && m === "POST") {
    return { isPro: true };
  }
  if (cleanUrl.endsWith("/api/events") && m === "POST") {
    return { ok: true };
  }

  // 2. Notes CRUD
  if (cleanUrl.endsWith("/api/notes") && m === "GET") {
    const notes = await idbGetAll<StoredNoteRecord>("notes");
    return notes.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  if (cleanUrl.endsWith("/api/notes") && m === "POST") {
    const now = new Date().toISOString();
    const created: StoredNoteRecord = {
      id: nextId(),
      title: String(bodyObj.title ?? "Untitled"),
      content: String(bodyObj.content ?? ""),
      category: String(bodyObj.category || "General"),
      paperTheme: String(bodyObj.paperTheme || "classic"),
      lineStyle: String(bodyObj.lineStyle || "lined"),
      inkColor: String(bodyObj.inkColor || ""),
      font: String(bodyObj.font || ""),
      textAlign: (bodyObj.textAlign as NoteTextAlign) || "left",
      pinned: Boolean(bodyObj.pinned ?? false),
      createdAt: now,
      updatedAt: now,
    };
    await idbPut("notes", created);
    return created;
  }

  const singleNoteMatch = cleanUrl.match(/\/api\/notes\/(\d+)$/);
  if (singleNoteMatch) {
    const id = Number(singleNoteMatch[1]);
    const notes = await idbGetAll<StoredNoteRecord>("notes");
    const existing = notes.find((n) => Number(n.id) === id);

    if (m === "GET") {
      if (!existing) throw new Error("Note not found");
      return existing;
    }
    if (m === "PATCH" || m === "PUT") {
      if (!existing) throw new Error("Note not found");
      const updated: StoredNoteRecord = {
        ...existing,
        ...(bodyObj.title !== undefined ? { title: String(bodyObj.title) } : {}),
        ...(bodyObj.content !== undefined ? { content: String(bodyObj.content) } : {}),
        ...(bodyObj.category !== undefined ? { category: String(bodyObj.category || "General") } : {}),
        ...(bodyObj.paperTheme !== undefined ? { paperTheme: String(bodyObj.paperTheme) } : {}),
        ...(bodyObj.lineStyle !== undefined ? { lineStyle: String(bodyObj.lineStyle) } : {}),
        ...(bodyObj.inkColor !== undefined ? { inkColor: String(bodyObj.inkColor) } : {}),
        ...(bodyObj.font !== undefined ? { font: String(bodyObj.font) } : {}),
        ...(bodyObj.textAlign !== undefined ? { textAlign: bodyObj.textAlign as NoteTextAlign } : {}),
        ...(bodyObj.pinned !== undefined ? { pinned: Boolean(bodyObj.pinned) } : {}),
        updatedAt: new Date().toISOString(),
      };
      await idbPut("notes", updated);
      return updated;
    }
    if (m === "DELETE") {
      await idbDelete("notes", id);
      return null;
    }
  }

  // 3. Conversations CRUD (for Sovereign Aether / Aria Work Pane)
  if ((cleanUrl.endsWith("/api/aether/conversations") || cleanUrl.endsWith("/api/openai/conversations")) && m === "GET") {
    return await idbGetAll<StoredConversationRecord>("conversations");
  }
  if ((cleanUrl.endsWith("/api/aether/conversations") || cleanUrl.endsWith("/api/openai/conversations")) && m === "POST") {
    const title = String(bodyObj.title || "Note Chat");
    const noteMatch = title.match(/#(\d+)/);
    const noteId = noteMatch ? Number(noteMatch[1]) : undefined;
    const convs = await idbGetAll<StoredConversationRecord>("conversations");
    if (noteId) {
      const found = convs.find((c) => c.noteId === noteId);
      if (found) return found;
    }
    const conv: StoredConversationRecord = {
      id: nextId(),
      noteId,
      title,
      createdAt: new Date().toISOString(),
    };
    await idbPut("conversations", conv);
    return conv;
  }

  const singleConvMatch = cleanUrl.match(/\/api\/(?:aether|openai)\/conversations\/(\d+)$/);
  if (singleConvMatch) {
    const cid = Number(singleConvMatch[1]);
    const convs = await idbGetAll<StoredConversationRecord>("conversations");
    const conv = convs.find((c) => Number(c.id) === cid) ?? {
      id: cid,
      title: "Sovereign Aether Studio",
      createdAt: new Date().toISOString(),
    };
    if (m === "GET") {
      const allMsgs = await idbGetAll<StoredMessageRecord>("messages");
      const msgs = allMsgs
        .filter((msg) => Number(msg.conversationId) === cid)
        .sort((a, b) => a.id - b.id);
      return { ...conv, messages: msgs };
    }
    if (m === "DELETE") {
      await idbDelete("conversations", cid);
      return null;
    }
  }

  // 4. Voice Dictation Auto-Polish via 24/7 Oracle Cloud Sovereign Aether
  if ((cleanUrl.endsWith("/api/aether/polish-text") || cleanUrl.endsWith("/api/openai/polish-text")) && m === "POST") {
    const rawText = String(bodyObj.text || "").trim();
    const ctx = String(bodyObj.context || "").trim();
    if (!rawText) return { text: "" };
    const prompt = ctx
      ? `Clean up only the punctuation, capitalization, and obvious speech-to-text homophones in this dictated text (using the preceding note context for names/terms). Preserve the speaker's exact wording and meaning. Output ONLY the cleaned text with zero commentary.\n\nPreceding context:\n${ctx}\n\nDictated text:\n${rawText}`
      : `Clean up only the punctuation, capitalization, and obvious speech-to-text homophones in this dictated text. Preserve the speaker's exact wording and meaning. Output ONLY the cleaned text with zero commentary:\n\n${rawText}`;

    for (const url of AETHER_ASSIST_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "polish", content: rawText, prompt }),
        });
        if (res.ok) {
          const dj = await res.json();
          const out = String(dj.result || dj.reply || "").trim();
          if (out) return { text: out };
        }
      } catch {
        /* try next */
      }
    }
    return { text: rawText };
  }

  // 5. Scan-to-Text (`⛶ Scan` button) — Real On-Device OCR + Cloud Assist Cleanup
  if ((cleanUrl.endsWith("/api/aether/scan-image") || cleanUrl.endsWith("/api/openai/scan-image")) && m === "POST") {
    const imageB64 = String(bodyObj.image || "");
    const contentType = String(bodyObj.contentType || "image/jpeg");
    if (!imageB64) return { text: "" };
    try {
      const scanned = await runLocalImageOcr(imageB64, contentType);
      if (scanned) return { text: scanned };
    } catch {
      /* ignore */
    }
    return { text: "" };
  }

  return { ok: true };
}

// ── Extract Pure Stationery Draft (Stripping Conversational Wrapper Chatter) ──
export function extractCleanDraftForStationery(rawAssistantReply: string): {
  title?: string;
  body: string;
  isLikelyPoem: boolean;
} {
  let text = String(rawAssistantReply || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { body: "", isLikelyPoem: false };

  // Strip common conversational opening lines ("Got it! Here's a rough draft...", "Sure! Here is...")
  const lines = text.split("\n");
  while (
    lines.length > 1 &&
    /^(got it|sure|certainly|absolutely|of course|here(?:'s| is)|let's start|i've drafted|below is)[^.!?\n]*[:.!]\s*$/i.test(
      lines[0].trim(),
    )
  ) {
    lines.shift();
  }
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();

  // Strip trailing follow-up questions ("Would you like to add or change anything?", "How does this sound?")
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  while (
    lines.length > 1 &&
    /^(would you like|how does (?:this|that) sound|let me know if|feel free to|want me to|shall i|---\s*$)/i.test(
      lines[lines.length - 1].trim(),
    )
  ) {
    lines.pop();
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  }

  // Extract optional "**Title: In His Presence**" or "# In His Presence"
  let extractedTitle: string | undefined;
  if (lines.length > 0) {
    const first = lines[0].trim();
    const titleMatch =
      first.match(/^\*{0,2}Title\s*:\s*(.+?)\*{0,2}$/i) ||
      first.match(/^#{1,3}\s+(.+?)$/);
    if (titleMatch) {
      extractedTitle = titleMatch[1].replace(/^\*+|\*+$/g, "").replace(/^["']|["']$/g, "").trim();
      lines.shift();
      while (lines.length > 0 && lines[0].trim() === "") lines.shift();
    }
  }

  const body = lines
    .join("\n")
    .replace(/^\*{2}(.+?)\*{2}$/gm, "$1")
    .trim();

  const nonEmptyLines = body.split("\n").filter((l) => l.trim().length > 0);
  const avgLen =
    nonEmptyLines.length > 0
      ? nonEmptyLines.reduce((acc, l) => acc + l.trim().length, 0) / nonEmptyLines.length
      : 100;
  const isLikelyPoem = nonEmptyLines.length >= 4 && avgLen < 58;

  return { title: extractedTitle, body, isLikelyPoem };
}

export async function getConversationMessages(conversationId: number): Promise<StoredMessageRecord[]> {
  const allMsgs = await idbGetAll<StoredMessageRecord>("messages");
  return allMsgs
    .filter((m) => Number(m.conversationId) === Number(conversationId))
    .sort((a, b) => a.id - b.id);
}

export async function appendConversationPair(
  conversationId: number,
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  const userRec: StoredMessageRecord = {
    id: nextId(),
    conversationId,
    role: "user",
    content: userMessage,
    createdAt: new Date().toISOString(),
  };
  await idbPut("messages", userRec);
  const asstRec: StoredMessageRecord = {
    id: nextId(),
    conversationId,
    role: "assistant",
    content: assistantMessage,
    createdAt: new Date().toISOString(),
  };
  await idbPut("messages", asstRec);
}

export interface CompanionUserProfile {
  preferredName: string;
  birthDate: string;
  aboutYou: string;
  onboardingCompleted: boolean;
  rememberedFacts: string[];
}

const LS_USER_PROFILE = "viper_my_ai_notebook_user_profile_v1";

export function getCompanionUserProfile(): CompanionUserProfile {
  try {
    const raw = localStorage.getItem(LS_USER_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        preferredName: String(parsed?.preferredName || "").trim(),
        birthDate: String(parsed?.birthDate || "").trim(),
        aboutYou: String(parsed?.aboutYou || "").trim(),
        onboardingCompleted: Boolean(parsed?.onboardingCompleted),
        rememberedFacts: Array.isArray(parsed?.rememberedFacts)
          ? parsed.rememberedFacts.map((x: unknown) => String(x || "").trim()).filter(Boolean)
          : [],
      };
    }
  } catch {
    /* ignore */
  }
  return {
    preferredName: "",
    birthDate: "",
    aboutYou: "",
    onboardingCompleted: false,
    rememberedFacts: [],
  };
}

export function saveCompanionUserProfile(patch: Partial<CompanionUserProfile>): CompanionUserProfile {
  const cur = getCompanionUserProfile();
  const baseFacts =
    patch.rememberedFacts !== undefined ? patch.rememberedFacts : cur.rememberedFacts;
  const nextBirth = patch.birthDate !== undefined ? patch.birthDate.trim() : cur.birthDate;
  const nextAbout = patch.aboutYou !== undefined ? patch.aboutYou.trim() : cur.aboutYou;
  const mergedFacts = [...baseFacts];
  if (nextBirth) mergedFacts.push(`Birth date: ${nextBirth}`);
  if (nextAbout) mergedFacts.push(`About user: ${nextAbout}`);

  const next: CompanionUserProfile = {
    preferredName:
      patch.preferredName !== undefined ? patch.preferredName.trim() : cur.preferredName,
    birthDate: nextBirth,
    aboutYou: nextAbout,
    onboardingCompleted:
      patch.onboardingCompleted !== undefined ? patch.onboardingCompleted : cur.onboardingCompleted,
    rememberedFacts: Array.from(new Set(mergedFacts.filter(Boolean))).slice(-18),
  };
  try {
    localStorage.setItem(LS_USER_PROFILE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function extractAndRememberUserFacts(userMessage: string): CompanionUserProfile {
  const cur = getCompanionUserProfile();
  let preferredName = cur.preferredName;
  const facts = [...cur.rememberedFacts];

  const introMatch = userMessage.match(
    /(?:^|[.!?]\s+)(?:hi[,!\s]+|hey[,!\s]+|hello[,!\s]+)?(?:my\s+name\s+is|please\s+call\s+me|you\s+can\s+call\s+me|call\s+me|i'm|i\s+am)\s+([A-Z][A-Za-z'-]{1,24})(?=\s*[.!?,]|\s+(?:and|so|who|from)\b|$)/
  );
  if (introMatch && introMatch[1]) {
    const candidate = introMatch[1].trim();
    if (
      !/^(?:Aria|Aether|GaiusBot|Ready|Writing|Here|Testing|Happy|Tired|Good|Fine|Great|Okay|Wondering|Trying|Looking)$/i.test(
        candidate
      )
    ) {
      preferredName = candidate;
    }
  }

  const factPatterns = [
    /\b(my\s+(?:wife|husband|daughter|son|mom|mother|dad|father|sister|brother|dog|cat|favorite\s+\w+)\s+[^.!?\n]{3,70})/i,
    /\b(i\s+(?:love|enjoy|collect|bake|cook|teach|work\s+as|live\s+in)\s+[^.!?\n]{3,70})/i,
  ];
  for (const rx of factPatterns) {
    const m = userMessage.match(rx);
    if (m && m[1]) {
      facts.push(m[1].trim());
    }
  }

  return saveCompanionUserProfile({ preferredName, rememberedFacts: facts });
}

// Live Active Stationery Snapshot Bridge (so Aria & Aether see unsaved typing in 0ms!)
let _liveNoteGetter: (() => {
  id: number;
  title: string;
  category: string;
  paperTheme: string;
  plainText: string;
} | null) | null = null;

export function registerLiveActiveNoteGetter(
  getter: (() => {
    id: number;
    title: string;
    category: string;
    paperTheme: string;
    plainText: string;
  } | null) | null
): void {
  _liveNoteGetter = getter;
}

// Explicit-Request-Only Note Rename & Folder Organization Helpers
export async function renameActiveNoteRecord(noteId: number, newTitle: string): Promise<StoredNoteRecord | null> {
  const snap = await getNoteSnapshotById(noteId);
  if (!snap) return null;
  const updated: StoredNoteRecord = {
    ...snap,
    title: newTitle.trim() || snap.title,
    updatedAt: new Date().toISOString(),
  };
  await idbPut("notes", updated);
  return updated;
}

export async function moveActiveNoteToFolder(noteId: number, folderName: string): Promise<StoredNoteRecord | null> {
  const snap = await getNoteSnapshotById(noteId);
  if (!snap) return null;
  const cleanFolder = folderName.trim() || "General";
  const updated: StoredNoteRecord = {
    ...snap,
    category: cleanFolder,
    updatedAt: new Date().toISOString(),
  };
  await idbPut("notes", updated);
  return updated;
}

function inferFolderForNote(title: string, plainBody: string): string {
  const hay = `${title} ${plainBody}`.toLowerCase();
  if (/\b(recipe|cup|cups|tbsp|tsp|tablespoon|teaspoon|oven|bake|baking|pie|crust|ingredients|preheat|simmer|flour|sugar)\b/.test(hay)) {
    return "Recipes";
  }
  if (/\b(poem|stanza|sonnet|haiku|verse)\b/.test(hay) || (plainBody.split("\n").length >= 6 && plainBody.length < 1200 && /\n/.test(plainBody) && /,\s*\n/.test(plainBody))) {
    return "Poems";
  }
  if (/\b(dear\s+\w+|sincerely|warmly|with\s+love|thank\s+you\s+for)\b/.test(hay)) {
    return "Letters";
  }
  if (/\b(scripture|sacrament|talk|church|prayer|christ|savior|nephi|alma|psalm|gospel)\b/.test(hay)) {
    return "Faith & Talks";
  }
  if (/\b(todo|to-do|groceries|buy|checklist|appointment|errands|task)\b/.test(hay)) {
    return "Lists & Tasks";
  }
  if (/\b(today\s+i|grateful|journal|diary|feeling|reflection)\b/.test(hay)) {
    return "Journal";
  }
  return "General";
}

export async function organizeAllNotesUponRequest(): Promise<{
  movedCount: number;
  summaryLines: string[];
  previousCategories: Array<{ id: number; category: string }>;
}> {
  const notes = await idbGetAll<StoredNoteRecord>("notes");
  const previousCategories = notes.map((n) => ({ id: n.id, category: n.category }));
  const byFolder: Record<string, string[]> = {};
  let movedCount = 0;

  for (const n of notes) {
    const plain = stripHtmlForAiContext(n.content);
    const targetFolder =
      n.category && n.category !== "General"
        ? n.category.charAt(0).toUpperCase() + n.category.slice(1)
        : inferFolderForNote(n.title, plain);
    if (targetFolder !== n.category) {
      movedCount += 1;
      await idbPut("notes", {
        ...n,
        category: targetFolder,
        updatedAt: new Date().toISOString(),
      });
    }
    byFolder[targetFolder] = byFolder[targetFolder] || [];
    byFolder[targetFolder].push(n.title || "Untitled");
  }

  const summaryLines = Object.entries(byFolder).map(
    ([folder, titles]) => `• **${folder}** (${titles.length}): ${titles.slice(0, 4).join(", ")}${titles.length > 4 ? "…" : ""}`
  );
  return { movedCount, summaryLines, previousCategories };
}

export async function streamAetherNotebookChat(opts: {
  conversationId: number;
  noteId?: number;
  companion?: CompanionId;
  userMessage: string;
  onDelta: (accumulated: string) => void;
}): Promise<string> {
  const { conversationId, noteId, companion = "aether", userMessage, onDelta } = opts;

  const profile = extractAndRememberUserFacts(userMessage);

  const userRecord: StoredMessageRecord = {
    id: nextId(),
    conversationId,
    role: "user",
    content: userMessage,
    createdAt: new Date().toISOString(),
  };
  await idbPut("messages", userRecord);

  let noteContextBlock = "";
  const liveSnap = _liveNoteGetter ? _liveNoteGetter() : null;
  if (liveSnap && (!noteId || Number(liveSnap.id) === Number(noteId))) {
    const plain = liveSnap.plainText.trim();
    noteContextBlock = `Title: "${liveSnap.title || "Untitled"}"\nFolder: ${liveSnap.category || "General"}\nStationery Theme: ${liveSnap.paperTheme || "classic"}\nCurrent Text on Stationery:\n${plain ? plain.slice(0, 5000) : "(Stationery page is currently blank)"}`;
  } else if (noteId) {
    const snap = await getNoteSnapshotById(noteId);
    if (snap) {
      const plain = stripHtmlForAiContext(snap.content);
      noteContextBlock = `Title: "${snap.title || "Untitled"}"\nFolder: ${snap.category || "General"}\nStationery Theme: ${snap.paperTheme || "classic"}\nCurrent Text on Stationery:\n${plain ? plain.slice(0, 5000) : "(Stationery page is currently blank)"}`;
    }
  }

  const allMsgs = await idbGetAll<StoredMessageRecord>("messages");
  const prior = allMsgs
    .filter((m) => Number(m.conversationId) === Number(conversationId) && m.id !== userRecord.id)
    .sort((a, b) => a.id - b.id)
    .slice(-10);

  let fullReply = "";

  // Primary Route: Dedicated Level-3 Notebook & ARPAbet Poetry Studio Endpoint (with 6-Pass Phonetic Hard-Gate QC!)
  for (const url of [
    "https://lds.viperstudiostechnologies.com/api/aether-bridge/notebook-assist",
    "https://aether.viperstudiostechnologies.com/api/aether-bridge/notebook-assist",
  ]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          companion,
          speakerName: profile.preferredName,
          rememberedFacts: profile.rememberedFacts,
          userMessage,
          noteContext: noteContextBlock,
          history: prior.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (res.ok) {
        const dj = await res.json();
        const reply = String(dj.reply || dj.result || "").trim();
        if (reply) {
          fullReply = reply;
          onDelta(fullReply);
          break;
        }
      }
    } catch {
      /* fallback to streaming gospel-studio */
    }
  }

  // Secondary Route: Live NDJSON Streaming Sovereign Companion Bridge (with prompt + history!)
  if (!fullReply.trim()) {
    for (const endpoint of AETHER_STREAM_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userMessage,
            history: prior.map((m) => ({ role: m.role, content: m.content })),
            memberSalutation: profile.preferredName,
            stream: true,
            mode: "chat",
            companion,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const rawLine of lines) {
              const trimmed = rawLine.trim();
              if (!trimmed) continue;
              const jsonStr = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed?.type === "delta" && typeof parsed?.fullText === "string") {
                  fullReply = parsed.fullText;
                  onDelta(fullReply);
                } else if (parsed?.type === "done" && typeof parsed?.reply === "string") {
                  fullReply = parsed.reply;
                  onDelta(fullReply);
                }
              } catch {
                /* partial frame */
              }
            }
          }
          if (fullReply.trim()) break;
        }
      } catch {
        /* try next */
      }
    }
  }

  if (!fullReply.trim()) {
    fullReply =
      companion === "aria"
        ? `I'm right here with you${profile.preferredName ? `, ${profile.preferredName}` : ""}! Tell me what you'd like to talk about, write, or organize together.`
        : `I'm right here with you${profile.preferredName ? `, ${profile.preferredName}` : ""}—tell me what you'd like to draft or explore together.`;
    onDelta(fullReply);
  }

  const assistantRecord: StoredMessageRecord = {
    id: nextId(),
    conversationId,
    role: "assistant",
    content: fullReply,
    createdAt: new Date().toISOString(),
  };
  await idbPut("messages", assistantRecord);

  return fullReply;
}

// ══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN NEURAL VOICE ENGINE (Ported 1:1 from Religious Studio `lds-15-minute-talks`)
// - WebAudio AudioContext + 1.35x GainNode clarity boost
// - Sentence-chunked parallel prefetch (`Aether` & `Aria` Sovereign Voice Vault)
// - Strict Half-Duplex Speaking State Listeners (pauses open mics so AI NEVER hears itself!)
// - Zero robotic `window.speechSynthesis` fallback!
// ══════════════════════════════════════════════════════════════════════════════

let _speechToken = 0;
let _activeAbortCtrl: AbortController | null = null;
let _sharedAudioCtx: AudioContext | null = null;
let _sharedGainNode: GainNode | null = null;
let _activeSourceNode: AudioBufferSourceNode | null = null;
let _activeHtmlAudio: HTMLAudioElement | null = null;
let _isCurrentlySpeaking = false;
const _speakingListeners = new Set<(speaking: boolean) => void>();

function notifySpeakingState(speaking: boolean): void {
  _isCurrentlySpeaking = speaking;
  _speakingListeners.forEach((fn) => {
    try {
      fn(speaking);
    } catch {
      /* ignore */
    }
  });
}

export function isSovereignVoiceSpeaking(): boolean {
  return _isCurrentlySpeaking;
}

export function subscribeSovereignVoiceSpeaking(listener: (speaking: boolean) => void): () => void {
  _speakingListeners.add(listener);
  listener(_isCurrentlySpeaking);
  return () => {
    _speakingListeners.delete(listener);
  };
}

function getSharedVoiceAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!_sharedAudioCtx) {
    _sharedAudioCtx = new Ctor();
    _sharedGainNode = _sharedAudioCtx.createGain();
    _sharedGainNode.gain.value = 1.35;
    _sharedGainNode.connect(_sharedAudioCtx.destination);
  }
  return _sharedAudioCtx;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function splitIntoSpeechChunks(raw: string, maxLen = 260): string[] {
  const clean = raw
    .replace(/\*\*/g, "")
    .replace(/[#*_`~>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const seg = s.trim();
    if (!seg) continue;
    if ((current + " " + seg).trim().length <= maxLen) {
      current = (current + " " + seg).trim();
    } else {
      if (current) chunks.push(current);
      if (seg.length <= maxLen) {
        current = seg;
      } else {
        for (let i = 0; i < seg.length; i += maxLen) {
          chunks.push(seg.slice(i, i + maxLen));
        }
        current = "";
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 8);
}

export function stopAetherVoicePlayback(): void {
  _speechToken += 1;
  if (_activeAbortCtrl) {
    try {
      _activeAbortCtrl.abort();
    } catch {
      /* ignore */
    }
    _activeAbortCtrl = null;
  }
  if (_activeSourceNode) {
    try {
      _activeSourceNode.stop(0);
      _activeSourceNode.disconnect();
    } catch {
      /* ignore */
    }
    _activeSourceNode = null;
  }
  if (_activeHtmlAudio) {
    try {
      _activeHtmlAudio.pause();
      _activeHtmlAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    _activeHtmlAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  notifySpeakingState(false);
}

async function fetchNeuralVoiceChunk(
  chunkText: string,
  companion: CompanionId,
  masterSignal: AbortSignal,
  token: number,
): Promise<{ audioBase64: string; mimeType: string } | null> {
  for (const ep of AETHER_VOICE_ENDPOINTS) {
    if (masterSignal.aborted || token !== _speechToken) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      try {
        ctrl.abort();
      } catch {
        /* ignore */
      }
    }, 12000);
    const onMasterAbort = () => {
      try {
        ctrl.abort();
      } catch {
        /* ignore */
      }
    };
    masterSignal.addEventListener("abort", onMasterAbort, { once: true });
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          text: chunkText,
          companion,
          languageCode: "en",
        }),
      });
      clearTimeout(timer);
      masterSignal.removeEventListener("abort", onMasterAbort);
      if (res.ok) {
        const dj = await res.json();
        if (dj && dj.audioBase64) {
          return {
            audioBase64: String(dj.audioBase64),
            mimeType: String(dj.mimeType || "audio/mpeg"),
          };
        }
      }
    } catch {
      clearTimeout(timer);
      masterSignal.removeEventListener("abort", onMasterAbort);
      if (masterSignal.aborted || token !== _speechToken) return null;
    }
  }
  return null;
}

async function playNeuralChunkBuffer(
  dj: { audioBase64: string; mimeType: string },
  token: number,
): Promise<boolean> {
  if (token !== _speechToken) return false;
  const ctx = getSharedVoiceAudioCtx();
  if (ctx) {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      const arrBuf = base64ToArrayBuffer(dj.audioBase64);
      const audioBuf = await ctx.decodeAudioData(arrBuf.slice(0));
      if (token !== _speechToken) return false;
      return await new Promise<boolean>((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(_sharedGainNode || ctx.destination);
        _activeSourceNode = src;
        src.onended = () => {
          if (_activeSourceNode === src) _activeSourceNode = null;
          resolve(token === _speechToken);
        };
        src.start(0);
      });
    } catch {
      /* fallback to HTMLAudioElement with exact same neural MP3 */
    }
  }
  return await new Promise<boolean>((resolve) => {
    if (token !== _speechToken) {
      resolve(false);
      return;
    }
    const audio = new Audio(`data:${dj.mimeType};base64,${dj.audioBase64}`);
    _activeHtmlAudio = audio;
    audio.onended = () => {
      if (_activeHtmlAudio === audio) _activeHtmlAudio = null;
      resolve(token === _speechToken);
    };
    audio.onerror = () => {
      if (_activeHtmlAudio === audio) _activeHtmlAudio = null;
      resolve(false);
    };
    audio.play().catch(() => resolve(false));
  });
}

export async function speakAetherNotebookReply(
  text: string,
  companion: CompanionId = "aether",
): Promise<void> {
  const chunks = splitIntoSpeechChunks(text, 260);
  if (chunks.length === 0) return;

  stopAetherVoicePlayback();
  const myToken = _speechToken;
  const masterAbort = new AbortController();
  _activeAbortCtrl = masterAbort;
  notifySpeakingState(true);

  try {
    // Pipeline prefetch: start fetching chunk 0 immediately, then prefetch chunk i+1 while chunk i plays!
    let nextPromise: Promise<{ audioBase64: string; mimeType: string } | null> | null =
      fetchNeuralVoiceChunk(chunks[0], companion, masterAbort.signal, myToken);

    for (let i = 0; i < chunks.length; i++) {
      if (myToken !== _speechToken || masterAbort.signal.aborted) break;
      const currentAudio = await nextPromise;
      if (myToken !== _speechToken || masterAbort.signal.aborted) break;

      nextPromise =
        i + 1 < chunks.length
          ? fetchNeuralVoiceChunk(chunks[i + 1], companion, masterAbort.signal, myToken)
          : null;

      if (!currentAudio) break;
      const keepGoing = await playNeuralChunkBuffer(currentAudio, myToken);
      if (!keepGoing) break;
    }
  } finally {
    if (myToken === _speechToken) {
      notifySpeakingState(false);
    }
  }
}

export async function compressInlinePhotoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ""));
      img.onload = () => {
        const maxDim = 1440;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}
