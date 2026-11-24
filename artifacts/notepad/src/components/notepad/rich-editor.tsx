import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { wrappingInputRule } from "@tiptap/react";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Typing "*** " at the start of a line converts to a bullet list (in addition
// to TipTap's built-in "* ", "- ", "+ " triggers).
const TripleStarBullet = Extension.create({
  name: "tripleStarBullet",
  addInputRules() {
    const type = this.editor.schema.nodes.bulletList;
    if (!type) return [];
    return [wrappingInputRule({ find: /^\*\*\*\s$/, type })];
  },
});

export interface ImageTarget {
  src: string;
  pos: number;
}

export interface RichEditorHandle {
  getText: () => string;
  insertText: (text: string) => void;
  setHtmlContent: (html: string) => void;
  insertImage: (src: string) => void;
  deleteImageAt: (pos: number) => void;
  getSearchTextLength: () => number;
  replaceLastText: (needle: string, replacement: string, searchFrom?: number) => boolean;
  focus: () => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  toggleTaskList: () => void;
}

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  onImageClick?: (target: ImageTarget) => void;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToHtml(text: string): string {
  if (!text) return "";
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>") || "<br>"}</p>`)
    .join("");
}

// Detects whether a paragraph element starts with a bold "Label:" — used
// to recognize ChatGPT-style key/value lists pasted as <p><strong>X:</strong> y</p>.
// Tolerates wrapping spans and bold-via-style: <p><span><strong>X</strong></span>: y</p>.
function paragraphStartsWithBoldLabel(p: Element): boolean {
  const fullText = (p.textContent ?? "").trim();
  if (!fullText) return false;
  // Need a label-like prefix ending in ":" within the first ~60 chars.
  const m = /^([^:\n]{1,60}):\s/.exec(fullText);
  if (!m) return false;
  const labelLen = m[1].length;
  // Walk the first text characters and confirm they live inside a bold node.
  let consumed = 0;
  function check(node: Node): boolean {
    if (consumed >= labelLen) return true;
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? "";
      if (!t) return true;
      const inBold = isInsideBold(node);
      const advance = Math.min(t.length, labelLen - consumed);
      if (advance > 0 && !inBold) return false;
      consumed += t.length;
      return true;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        if (!check(child)) return false;
        if (consumed >= labelLen) return true;
      }
    }
    return true;
  }
  return check(p) && consumed >= labelLen;
}

function isInsideBold(node: Node): boolean {
  let cur: Node | null = node.parentNode;
  while (cur && cur.nodeType === Node.ELEMENT_NODE) {
    const el = cur as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") return true;
    if (tag === "p") return false;
    const style = (el.getAttribute("style") ?? "").toLowerCase();
    if (/font-weight\s*:\s*(bold|[6-9]00)/.test(style)) return true;
    cur = cur.parentNode;
  }
  return false;
}

// Walks the DOM and rewrites runs of 2+ consecutive <p> elements that each
// start with a bold "Label:" into a single <ul> of <li> items. Preserves any
// inline formatting inside each paragraph.
function htmlBoldLabelParasToList(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    if (!root) return html;
    const children = Array.from(root.children);
    let i = 0;
    while (i < children.length) {
      const el = children[i];
      if (el.tagName.toLowerCase() === "p" && paragraphStartsWithBoldLabel(el)) {
        let j = i + 1;
        while (
          j < children.length &&
          children[j].tagName.toLowerCase() === "p" &&
          paragraphStartsWithBoldLabel(children[j])
        ) {
          j++;
        }
        if (j - i >= 2) {
          const ul = doc.createElement("ul");
          for (let k = i; k < j; k++) {
            const li = doc.createElement("li");
            let n = children[k].firstChild;
            while (n) {
              li.appendChild(n);
              n = children[k].firstChild;
            }
            ul.appendChild(li);
          }
          root.insertBefore(ul, children[i]);
          for (let k = i; k < j; k++) children[k].remove();
          children.splice(i, j - i, ul);
          i++;
          continue;
        }
      }
      i++;
    }
    return root.innerHTML;
  } catch {
    return html;
  }
}

function isHtml(s: string): boolean {
  if (!s) return false;
  return /<(p|h[1-6]|ul|ol|li|blockquote|pre|div|img|br|strong|em|code)[\s>]/i.test(
    s,
  );
}

function toHtml(content: string): string {
  return isHtml(content) ? content : plainTextToHtml(content);
}

function looksLikeMarkdown(text: string): boolean {
  return (
    /(^|\n)\s{0,3}([-*+•‣▪◦·]|\d+\.)\s+\S/m.test(text) || // lists (incl. unicode bullets)
    /\*\*[^*\n]+\*\*/.test(text) || // **bold**
    /__[^_\n]+__/.test(text) || // __bold__
    /(^|\s)\*[^*\n]+\*(\s|$|[.,;!?])/.test(text) || // *italic*
    /(^|\n)#{1,6}\s+\S/m.test(text) || // # heading
    /`[^`\n]+`/.test(text) || // `code`
    /(^|\n)```/m.test(text) || // ```code block```
    /\[[^\]\n]+\]\([^)\s]+\)/.test(text) || // [link](url)
    /(^|\n)>\s+\S/m.test(text) // > quote
  );
}

// Normalize Unicode bullets that mobile apps (incl. ChatGPT) often paste
// instead of markdown "* " markers. Run before markdownToHtml so they get
// turned into proper <ul>/<li>.
function normalizeBullets(text: string): string {
  return text.replace(/(^|\n)[ \t]*[•‣▪◦·][ \t]+/g, "$1* ");
}

function applyInlineMd(s: string): string {
  // Protect inline code from other replacements
  const codes: string[] = [];
  s = s.replace(/`([^`\n]+)`/g, (_m, c: string) => {
    codes.push(`<code>${escapeHtml(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  // Escape remaining HTML
  s = escapeHtml(s);
  // Bold
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");
  // Italic (single * or _, not part of **/__)
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_\w])_([^_\n]+?)_(?!\w)/g, "$1<em>$2</em>");
  // Links
  s = s.replace(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  // Restore code
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[parseInt(i, 10)]);
  return s;
}

function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${applyInlineMd(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    const ul = /^\s{0,3}[-*+•‣▪◦·]\s+(.+)$/.exec(line);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${applyInlineMd(ul[1])}</li>`);
      i++;
      continue;
    }

    // Heuristic: ChatGPT-style "**Label:** value" on consecutive lines → bulleted list
    const boldLabel = /^\s*\*\*[^*\n]+?:\*\*\s+\S/.test(line);
    if (boldLabel) {
      const next = lines[i + 1] ?? "";
      const prev = listType === "ul" ? true : /^\s*\*\*[^*\n]+?:\*\*\s+\S/.test(next);
      if (prev) {
        if (listType !== "ul") {
          closeList();
          out.push("<ul>");
          listType = "ul";
        }
        out.push(`<li>${applyInlineMd(line.trim())}</li>`);
        i++;
        continue;
      }
    }

    const ol = /^\s{0,3}\d+\.\s+(.+)$/.exec(line);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${applyInlineMd(ol[1])}</li>`);
      i++;
      continue;
    }

    const bq = /^>\s+(.+)$/.exec(line);
    if (bq) {
      closeList();
      out.push(`<blockquote><p>${applyInlineMd(bq[1])}</p></blockquote>`);
      i++;
      continue;
    }

    if (line.trim() === "") {
      closeList();
      i++;
      continue;
    }

    closeList();
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6}\s|\s*```|\s{0,3}[-*+]\s|\s{0,3}\d+\.\s|>\s)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${applyInlineMd(para.join("\n").replace(/\n/g, "<br>"))}</p>`);
  }

  if (inCode && codeBuf.length) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  closeList();
  return out.join("");
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  function RichEditor(
    { content, onChange, placeholder, className, onImageClick },
    ref,
  ) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const onImageClickRef = useRef(onImageClick);
    onImageClickRef.current = onImageClick;

    const editor = useEditor({
      extensions: [
        // Disable HorizontalRule so its built-in input rule doesn't hijack
        // "*** " (or "---") and turn it into an <hr> instead of a bullet list.
        StarterKit.configure({ horizontalRule: false }),
        TripleStarBullet,
        TaskList.configure({ HTMLAttributes: { class: "task-list" } }),
        TaskItem.configure({ nested: true, HTMLAttributes: { class: "task-item" } }),
        Image.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: { class: "note-image", draggable: "false" },
        }),
        Placeholder.configure({ placeholder: placeholder ?? "" }),
      ],
      content: toHtml(content),
      onUpdate: ({ editor }) => {
        onChangeRef.current(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: "tiptap-content focus:outline-none",
        },
        handleClickOn(_view, pos, node) {
          if (node.type.name === "image" && onImageClickRef.current) {
            const src = (node.attrs as { src?: string }).src;
            if (src) onImageClickRef.current({ src, pos });
            return true;
          }
          return false;
        },
        handlePaste(view, event) {
          const cd = event.clipboardData;
          if (!cd) return false;
          let html = cd.getData("text/html");
          const text = cd.getData("text/plain");
          // ChatGPT-style: consecutive <p> blocks that each start with a
          // bold "Label:" — rewrite them into a <ul> so they paste as a real
          // bulleted list. Plain text from ChatGPT strips the asterisks, so
          // the markdown-side detector never fires; we have to catch it here.
          // The transform itself is conditional (needs 2+ matching paras) so
          // we can run it unconditionally whenever HTML is present.
          if (html && /<\/?(strong|b)\b/i.test(html)) {
            html = htmlBoldLabelParasToList(html);
          }
          // Mobile clipboards (Firefox/Chrome on Android, iOS Safari) often hand
          // us HTML that *looks* rich (has <p>, <a>, maybe <span>) but doesn't
          // actually contain the bold/list/heading formatting from the source.
          // Meanwhile the plain-text version still carries the markdown markers
          // (** **, "- item", "• item", "# heading", etc.). Prefer markdown
          // conversion whenever the HTML fails to cover what the text needs.
          const textHasListMarkers =
            !!text && /(^|\n)\s{0,3}([-*+•‣▪◦·]|\d+\.)\s+\S/.test(text);
          // ChatGPT-style "**Label:** value" lines (2+ in a row) — we render
          // these as a bulleted list, so treat them as list markers too.
          const textHasBoldLabelList =
            !!text &&
            /\*\*[^*\n]+?:\*\*[^\n]*\n\s*\*\*[^*\n]+?:\*\*/.test(text);
          const textHasBold =
            !!text && (/\*\*[^*\n]+\*\*/.test(text) || /__[^_\n]+__/.test(text));
          const textHasHeading = !!text && /(^|\n)#{1,6}\s+\S/.test(text);
          const textHasMdLink = !!text && /\[[^\]\n]+\]\([^)\s]+\)/.test(text);
          const textHasCode = !!text && (/`[^`\n]+`/.test(text) || /(^|\n)```/.test(text));
          const htmlHasList = !!html && /<(ul|ol|li)\b/i.test(html);
          const htmlHasBold = !!html && /<(strong|b)\b/i.test(html);
          const htmlHasHeading = !!html && /<h[1-6]\b/i.test(html);
          const htmlHasLink = !!html && /<a\b/i.test(html);
          const htmlHasCode = !!html && /<(code|pre)\b/i.test(html);
          const htmlMissesMarkdown =
            (textHasListMarkers && !htmlHasList) ||
            (textHasBoldLabelList && !htmlHasList) ||
            (textHasBold && !htmlHasBold) ||
            (textHasHeading && !htmlHasHeading) ||
            (textHasMdLink && !htmlHasLink) ||
            (textHasCode && !htmlHasCode);
          if (html && html.trim() && !htmlMissesMarkdown) {
            // HTML already represents all the markdown features in the text —
            // let TipTap handle it natively (preserves any extras the HTML had).
            const htmlHasAnyRich =
              htmlHasList ||
              htmlHasBold ||
              htmlHasHeading ||
              htmlHasLink ||
              htmlHasCode ||
              /<(em|i|u|blockquote|table|img)\b/i.test(html);
            if (htmlHasAnyRich) return false;
          }
          if (!text || !looksLikeMarkdown(text)) return false;

          const converted = markdownToHtml(normalizeBullets(text));
          const dom = document.createElement("div");
          dom.innerHTML = converted;
          const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(dom, {
            preserveWhitespace: false,
          });
          view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
          event.preventDefault();
          return true;
        },
      },
    });

    // Sync incoming content (e.g. switching notes) into the editor.
    useEffect(() => {
      if (!editor) return;
      const incoming = toHtml(content);
      const current = editor.getHTML();
      if (incoming === current) return;
      editor.commands.setContent(incoming, { emitUpdate: false });
    }, [content, editor]);

    useImperativeHandle(
      ref,
      () => ({
        getText: () => {
          if (!editor) return "";
          // Read the full document directly — reliable for very long notes,
          // and preserves Shift+Enter line breaks (hardBreak) as newlines.
          const doc = editor.state.doc;
          return doc.textBetween(0, doc.content.size, "\n\n", (leaf) =>
            leaf.type.name === "hardBreak" ? "\n" : "",
          );
        },
        insertText: (text: string) => {
          if (!editor) return;
          editor.chain().focus().insertContent(text).run();
        },
        setHtmlContent: (html: string) => {
          if (!editor) return;
          editor.commands.setContent(toHtml(html), { emitUpdate: true });
        },
        insertImage: (src: string) => {
          if (!editor) return;
          editor.chain().focus().setImage({ src }).run();
        },
        deleteImageAt: (pos: number) => {
          if (!editor || pos < 0) return;
          const docSize = editor.state.doc.content.size;
          if (pos >= docSize) return;
          const node = editor.state.doc.nodeAt(pos);
          if (!node || node.type.name !== "image") return;
          editor
            .chain()
            .focus()
            .setNodeSelection(pos)
            .deleteSelection()
            .run();
        },
        // Length of the doc text in the same serialization replaceLastText
        // searches, so callers can record a stable "search from here" offset.
        getSearchTextLength: () => {
          if (!editor) return 0;
          const doc = editor.state.doc;
          return doc.textBetween(0, doc.content.size, "\n", "\n").length;
        },
        replaceLastText: (needle: string, replacement: string, searchFrom?: number) => {
          if (!editor || !needle) return false;
          const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", "\n");
          const idx =
            typeof searchFrom === "number"
              ? docText.indexOf(needle, Math.max(0, searchFrom))
              : docText.lastIndexOf(needle);
          if (idx < 0) return false;
          let from = -1;
          let to = -1;
          let cursor = 0;
          editor.state.doc.descendants((node, pos) => {
            if (from >= 0 && to >= 0) return false;
            if (!node.isText) return true;
            const nodeStart = cursor;
            const nodeEnd = cursor + (node.text?.length ?? 0);
            if (from < 0 && idx >= nodeStart && idx < nodeEnd) {
              from = pos + (idx - nodeStart);
            }
            const endIdx = idx + needle.length;
            if (to < 0 && endIdx >= nodeStart && endIdx <= nodeEnd) {
              to = pos + (endIdx - nodeStart);
            }
            cursor = nodeEnd;
            return true;
          });
          if (from < 0 || to < 0) return false;
          editor.chain().focus().insertContentAt({ from, to }, replacement).run();
          return true;
        },
        focus: () => editor?.commands.focus(),
        toggleBulletList: () => {
          editor?.chain().focus().toggleBulletList().run();
        },
        toggleOrderedList: () => {
          editor?.chain().focus().toggleOrderedList().run();
        },
        toggleTaskList: () => {
          editor?.chain().focus().toggleList("taskList", "taskItem").run();
        },
      }),
      [editor],
    );

    return (
      <div className={className}>
        <EditorContent editor={editor} />
      </div>
    );
  },
);
