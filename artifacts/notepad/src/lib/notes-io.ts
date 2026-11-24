import type { Note } from "@workspace/api-client-react";

export interface ImportedNote {
  title: string;
  content: string;
  category: string;
}

const NOTE_SENTINEL = "<!--mynote-->";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function looksLikeHtml(s: string): boolean {
  return /<\/?(p|div|br|ul|ol|li|h[1-6]|strong|em|b|i|blockquote|a|span)\b/i.test(s);
}

/** Convert stored note HTML into readable plain text with line breaks. */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html.trim();
  const prepared = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const tmp = document.createElement("div");
  tmp.innerHTML = prepared;
  const text = tmp.textContent ?? "";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** Convert plain text into simple HTML paragraphs the editor understands. */
export function plainTextToHtml(text: string): string {
  const normalized = (text ?? "").replace(/\r\n/g, "\n");
  const paras = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 0) return "";
  return paras
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** If a value already looks like HTML keep it, otherwise wrap plain text. */
function coerceContent(value: string): string {
  if (!value) return "";
  return looksLikeHtml(value) ? value : plainTextToHtml(value);
}

/** Build a single readable Markdown document from all notes. */
export function notesToMarkdown(notes: Note[]): string {
  const header = `# My AI Notebook export\n\nExported ${new Date().toLocaleString()} · ${notes.length} note(s)\n`;
  const body = notes
    .map((n) => {
      const title = (n.title || "Untitled").trim();
      const text = htmlToPlainText(n.content || "");
      const meta = JSON.stringify({
        title,
        category: n.category || "General",
        createdAt: n.createdAt,
      });
      return `${NOTE_SENTINEL}\n## ${title}\n\n${text}\n\n<!--meta:${meta}-->\n`;
    })
    .join("\n");
  return `${header}\n${body}`;
}

function parseSentinelChunks(raw: string): ImportedNote[] {
  // Everything before the first sentinel is the export header/preamble, never a note.
  return raw
    .split(NOTE_SENTINEL)
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      let category = "General";
      let title = "";
      let body = chunk;
      const metaMatch = chunk.match(/<!--meta:([\s\S]*?)-->/);
      if (metaMatch) {
        try {
          const m = JSON.parse(metaMatch[1]) as {
            title?: string;
            category?: string;
          };
          category = (m.category || "General").trim() || "General";
          title = (m.title || "").trim();
        } catch {
          /* ignore malformed meta */
        }
        body = body.replace(metaMatch[0], "");
      }
      const lines = body.split("\n");
      const hIdx = lines.findIndex((l) => l.startsWith("## "));
      if (!title && hIdx >= 0) title = lines[hIdx].slice(3).trim();
      if (hIdx >= 0) lines.splice(hIdx, 1);
      const text = lines.join("\n").trim();
      return {
        title: title || "Imported note",
        category,
        content: plainTextToHtml(text),
      };
    })
    .filter((n) => n.title || n.content);
}

/**
 * Parse an imported file into notes. Supports:
 * - our own Markdown export (sentinel based, full fidelity)
 * - a JSON array of { title, content/body/text, category? }
 * - generic Markdown split on top-level # / ## headings
 * - any other text file -> a single note titled by the filename
 */
export function parseImportFile(filename: string, raw: string): ImportedNote[] {
  const trimmed = raw.trim();
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data) ? data : data?.notes;
      if (Array.isArray(arr)) {
        return arr
          .map((d: Record<string, unknown>) => {
            const value = (d.content ?? d.body ?? d.text ?? "") as string;
            return {
              title: String(d.title ?? d.name ?? "Imported note").trim() || "Imported note",
              category: String(d.category ?? "General").trim() || "General",
              content: coerceContent(String(value)),
            };
          })
          .filter((n) => n.title || n.content);
      }
    } catch {
      /* not valid JSON, fall through to text handling */
    }
  }

  if (raw.includes(NOTE_SENTINEL)) {
    return parseSentinelChunks(raw);
  }

  const headingSplit = raw.split(/\n(?=#{1,2}\s)/);
  if (headingSplit.length > 1) {
    return headingSplit
      .map((chunk) => {
        const lines = chunk.split("\n");
        const first = lines[0] || "";
        const title = first.replace(/^#{1,2}\s*/, "").trim() || "Imported note";
        const text = lines.slice(1).join("\n").trim();
        return {
          title,
          category: "General",
          content: plainTextToHtml(text),
        };
      })
      .filter((n) => n.content || n.title);
  }

  const base = filename.replace(/\.[^.]+$/, "").trim() || "Imported note";
  return [{ title: base, category: "General", content: plainTextToHtml(trimmed) }];
}

/** Trigger a browser download of a text file. */
export function downloadTextFile(filename: string, content: string, mime = "text/markdown"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
