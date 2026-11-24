/**
 * Copyright © 2026 Viper Studios Technologies. All Rights Reserved.
 * Built with AetherPrime (.ae) & AIR IR (.air) — Permanent Studio Rule 64
 *
 * Sovereign On-Device Vault + 24/7 Oracle Cloud Aether AI & Voice Bridge
 * Replaces Replit PostgreSQL, Replit Clerk lock-in, Replit GCS, and OpenAI
 * while preserving 100% of Guy's exact My AI Notebook UI & data contracts.
 */

export interface StoredNoteRecord {
  id: number;
  title: string;
  content: string;
  category: string;
  paperTheme: string;
  lineStyle: string;
  inkColor: string;
  font: string;
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
      inkColor: String(bodyObj.inkColor ?? ""),
      font: String(bodyObj.font ?? ""),
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

  // 3. Conversations CRUD (for Aether Writing Assistant panel)
  if (cleanUrl.endsWith("/api/openai/conversations") && m === "GET") {
    return await idbGetAll<StoredConversationRecord>("conversations");
  }
  if (cleanUrl.endsWith("/api/openai/conversations") && m === "POST") {
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

  const singleConvMatch = cleanUrl.match(/\/api\/openai\/conversations\/(\d+)$/);
  if (singleConvMatch) {
    const cid = Number(singleConvMatch[1]);
    const convs = await idbGetAll<StoredConversationRecord>("conversations");
    const conv = convs.find((c) => Number(c.id) === cid) ?? {
      id: cid,
      title: "Aether Writing Chat",
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
  if (cleanUrl.endsWith("/api/openai/polish-text") && m === "POST") {
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

  // 5. Scan-to-Text via Sovereign Aether Cloud Bridge
  if (cleanUrl.endsWith("/api/openai/scan-image") && m === "POST") {
    const imageB64 = String(bodyObj.image || "");
    const contentType = String(bodyObj.contentType || "image/jpeg");
    for (const url of AETHER_ASSIST_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ocr_scan",
            imageBase64: imageB64,
            mimeType: contentType,
            prompt: "Transcribe all visible text from this image accurately.",
          }),
        });
        if (res.ok) {
          const dj = await res.json();
          const out = String(dj.text || dj.result || dj.reply || "").trim();
          if (out) return { text: out };
        }
      } catch {
        /* try next */
      }
    }
    return { text: "" };
  }

  return { ok: true };
}

export async function streamAetherNotebookChat(opts: {
  conversationId: number;
  noteId?: number;
  userMessage: string;
  onDelta: (accumulated: string) => void;
}): Promise<string> {
  const { conversationId, noteId, userMessage, onDelta } = opts;

  const userRec: StoredMessageRecord = {
    id: nextId(),
    conversationId,
    role: "user",
    content: userMessage,
    createdAt: new Date().toISOString(),
  };
  await idbPut("messages", userRec);

  const allMsgs = await idbGetAll<StoredMessageRecord>("messages");
  const history = allMsgs
    .filter((m) => Number(m.conversationId) === Number(conversationId))
    .sort((a, b) => a.id - b.id)
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content }));

  let noteContextBlock = "";
  if (noteId) {
    const snap = await getNoteSnapshotById(noteId);
    if (snap) {
      const plain = stripHtmlForAiContext(snap.content).slice(0, 3500);
      noteContextBlock = `\n\n[Active Open Note — Title: "${snap.title || "Untitled"}" | Section: "${snap.category || "General"}"]\n${plain || "(Note is currently blank — help the user start writing!)"}`;
    }
  }

  const enrichedPrompt =
    `You are Aether, a warm, articulate, practical AI writing companion built into My AI Notebook. ` +
    `Help the user brainstorm, write, polish, expand, summarize, or talk through ideas naturally and directly without filler.` +
    noteContextBlock +
    `\n\nUser request: ${userMessage}`;

  let finalReply = "";

  // Primary: 24/7 Oracle Cloud Sovereign Aether NDJSON Stream (aether-prime:latest)
  for (const ep of AETHER_STREAM_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          stream: true,
          companion: "aether",
          prompt: enrichedPrompt,
          history: history.slice(0, -1),
        }),
      });
      if (res.ok) {
        const cType = String(res.headers.get("content-type") || "").toLowerCase();
        if (cType.includes("ndjson") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const ln of lines) {
              const trimmed = ln.trim();
              if (!trimmed) continue;
              try {
                const evt = JSON.parse(trimmed);
                if (evt.type === "delta" && evt.fullText) {
                  finalReply = String(evt.fullText);
                  onDelta(finalReply);
                } else if (evt.type === "done" && evt.reply) {
                  finalReply = String(evt.reply);
                  onDelta(finalReply);
                }
              } catch {
                /* ignore partial json */
              }
            }
          }
          if (finalReply.trim()) break;
        } else {
          const dj = await res.json();
          const text = String(dj.reply || dj.result || "").trim();
          if (text) {
            finalReply = text;
            onDelta(finalReply);
            break;
          }
        }
      }
    } catch {
      /* failover to notebook-assist */
    }
  }

  // Secondary failover: notebook-assist REST endpoint
  if (!finalReply.trim()) {
    for (const ep of AETHER_ASSIST_ENDPOINTS) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat",
            prompt: enrichedPrompt,
            content: userMessage,
          }),
        });
        if (res.ok) {
          const dj = await res.json();
          const text = String(dj.result || dj.reply || "").trim();
          if (text) {
            finalReply = text;
            onDelta(finalReply);
            break;
          }
        }
      } catch {
        /* continue */
      }
    }
  }

  if (!finalReply.trim()) {
    finalReply = "I'm having trouble reaching the cloud right now — please check your internet connection and try again.";
    onDelta(finalReply);
  }

  const aiRec: StoredMessageRecord = {
    id: nextId(),
    conversationId,
    role: "assistant",
    content: finalReply,
    createdAt: new Date().toISOString(),
  };
  await idbPut("messages", aiRec);
  return finalReply;
}

let _activeAudio: HTMLAudioElement | null = null;

export function stopAetherVoicePlayback(): void {
  if (_activeAudio) {
    try {
      _activeAudio.pause();
      _activeAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    _activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export async function speakAetherNotebookReply(
  text: string,
  companion: "aria" | "aether" = "aria",
): Promise<void> {
  const clean = text
    .replace(/[#*_`~>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return;
  stopAetherVoicePlayback();

  for (const ep of AETHER_VOICE_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          text: clean.slice(0, 1400),
          companion,
          langCode: "en",
        }),
      });
      clearTimeout(tid);
      if (res.ok) {
        const dj = await res.json();
        if (dj && dj.audioBase64) {
          const audio = new Audio(
            `data:${dj.mimeType || "audio/mpeg"};base64,${dj.audioBase64}`,
          );
          _activeAudio = audio;
          await audio.play();
          return;
        }
      }
    } catch {
      /* fallback to local TTS if offline */
    }
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const utt = new SpeechSynthesisUtterance(clean);
    window.speechSynthesis.speak(utt);
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
