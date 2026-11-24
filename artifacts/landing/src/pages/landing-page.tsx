import { useState, useEffect, useRef } from "react";
import { Check, Sparkles, Mic, Globe, FileText, Share2, Download, Smartphone, ScanLine, Image as ImageIcon, Palette, FolderTree, Save, Clipboard } from "lucide-react";

const NOTEPAD_URL = import.meta.env.BASE_URL.replace("/landing/", "/notepad/").replace(/\/$/, "") || "/notepad";

type LineStyle = "normal" | "dim";
interface MockupLine {
  text: string;
  style: LineStyle;
}

const FEATURES = [
  {
    icon: FileText,
    title: "Lined Paper Editor",
    desc: "Write on a beautiful lined-paper canvas with rich text formatting, just like a real notebook."
  },
  {
    icon: ScanLine,
    title: "Scan to Text",
    desc: "Snap a photo of a handwritten page, receipt, or whiteboard — AI vision turns it into editable text instantly."
  },
  {
    icon: Sparkles,
    title: "AI Writing Assistant",
    desc: "Expand ideas, fix grammar, rewrite paragraphs, or brainstorm — powered by the latest GPT models."
  },
  {
    icon: Mic,
    title: "Voice Dictation + AI Cleanup",
    desc: "Speak your thoughts hands-free. When you stop, AI fixes mis-heard words and adds punctuation automatically — perfect for the car or the couch."
  },
  {
    icon: Clipboard,
    title: "Smart Markdown Paste",
    desc: "Paste from ChatGPT or any markdown source — bold, headings, lists, and links convert to formatted text instantly. No more raw asterisks."
  },
  {
    icon: ImageIcon,
    title: "Inline Photos",
    desc: "Drop photos right into your notes. Tap to enlarge, drag to reposition — your notebook, your way."
  },
  {
    icon: FolderTree,
    title: "Sections & Pinning",
    desc: "Organize notes into custom sections. Pin favorites to the top, long-press to rename or move them anywhere."
  },
  {
    icon: Palette,
    title: "Themes & Ink",
    desc: "Choose your paper style, line color, and ink — make every notebook feel like yours."
  },
  {
    icon: Globe,
    title: "26 Languages",
    desc: "Write in English, Spanish, Japanese, Arabic, Hindi, and 21 more — switch any time."
  },
  {
    icon: Share2,
    title: "Shareable Links",
    desc: "Generate a public link for any note. No account required to view — perfect for collaborators."
  },
  {
    icon: Download,
    title: "Print & Export",
    desc: "Print exactly as it looks on screen, or save as a clean PDF — photos and formatting included."
  },
  {
    icon: Smartphone,
    title: "Install as App",
    desc: "Install on your phone or desktop. Works offline with full PWA support."
  },
  {
    icon: Save,
    title: "Auto-save",
    desc: "Never lose a thought. Notes save automatically as you type, every keystroke."
  },
];

const LANGUAGES = [
  "English", "Español", "Français", "Deutsch", "日本語", "中文",
  "한국어", "العربية", "Português", "Italiano", "Русский", "हिन्दी",
  "Nederlands", "Polski", "Türkçe", "Svenska", "Dansk", "Norsk",
  "Suomi", "ภาษาไทย", "Tiếng Việt", "Bahasa Indonesia", "Bahasa Melayu",
  "Ελληνικά", "Čeština", "Română",
];

function NotepadMockup() {
  const lines: MockupLine[] = [
    { text: "Today I'm thinking about the way light", style: "normal" },
    { text: "plays on morning water — ripples", style: "normal" },
    { text: "expanding outward, each one a story.", style: "normal" },
    { text: "", style: "normal" },
    { text: "AI: Consider describing the color", style: "dim" },
    { text: "temperature of the light...", style: "dim" },
    { text: "", style: "normal" },
    { text: "Voice note — 9:14am:", style: "dim" },
    { text: "The heron stood perfectly still", style: "dim" },
    { text: "for almost five minutes.", style: "dim" },
    { text: "", style: "normal" },
    { text: "Category: Nature Journal", style: "dim" },
  ];

  return (
    <div
      className="relative w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-border/60"
      style={{ background: "hsl(43 33% 97%)" }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-sidebar">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-green-400 opacity-80" />
        </div>
        <span className="text-xs text-muted-foreground font-medium ml-auto font-serif italic">Nature Journal</span>
      </div>
      <div
        className="px-6 pt-4 pb-2"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, #a8c4d8 28px)",
          backgroundSize: "100% 28px",
          minHeight: "14rem",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className="h-7 flex items-end pb-0.5 text-sm"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "hsl(25 20% 20%)",
              opacity: line.style === "dim" ? 0.55 : 1,
              fontStyle: line.style === "dim" ? "italic" : "normal",
              fontSize: line.style === "dim" ? "0.72rem" : "0.875rem",
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-sidebar/70 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice</span>
        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</span>
        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> EN</span>
        <span className="ml-auto opacity-50">Saved</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [langIdx, setLangIdx] = useState(0);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const iv = setInterval(() => {
      setLangIdx((i) => (i + 1) % LANGUAGES.length);
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible((v) => new Set([...v, e.target.id]));
          }
        });
      },
      { threshold: 0.15 }
    );
    sectionRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  function ref(id: string) {
    return (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(id, el);
    };
  }

  const appUrl = "/";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <span className="font-serif text-xl font-semibold text-foreground italic">My AI Notebook</span>
          <div className="flex items-center gap-3">
            <a
              href={appUrl}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </a>
            <a
              href={appUrl}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Try free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-6 border border-border">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Powered by the latest GPT models
        </div>

        <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
          Your thoughts,{" "}
          <span className="italic text-primary">beautifully kept</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
          A personal notepad with a lined-paper feel — plus AI writing, voice dictation
          with auto-cleanup, photo scanning, smart markdown paste, inline images, and 26 languages.
          Write freely. Think clearly.
        </p>

        <p
          className="text-sm font-medium text-muted-foreground mb-10 transition-all duration-500"
          key={langIdx}
          style={{ opacity: 0.7 }}
        >
          Now writing in <span className="text-primary font-semibold">{LANGUAGES[langIdx]}</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <a
            href={appUrl}
            className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity shadow-md"
          >
            Start writing — it's free
          </a>
          <a
            href="#features"
            className="px-8 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-base hover:bg-accent transition-colors border border-border"
          >
            See features
          </a>
        </div>

        {/* Mockup */}
        <div className="flex justify-center">
          <div className="animate-float-up">
            <NotepadMockup />
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="border-y border-border bg-secondary/40 py-4">
        <p className="text-center text-sm text-muted-foreground">
          <strong className="text-foreground">Scan to text</strong> · AI writing assistant ·
          Voice dictation with AI cleanup · Markdown paste · Inline photos ·
          Pin & organize · 26 languages · PWA installable
        </p>
      </div>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-24">
        <div
          id="features-title"
          ref={ref("features-title")}
          className={`text-center mb-14 transition-all duration-700 ${visible.has("features-title") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2 className="font-serif text-4xl font-bold text-foreground mb-3">
            Everything you need to think better
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Built for writers, thinkers, and anyone who wants to capture ideas beautifully.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const id = `feature-${i}`;
            return (
              <div
                key={i}
                id={id}
                ref={ref(id)}
                className={`rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-700 ${visible.has(id) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Languages */}
      <section className="bg-secondary/30 border-y border-border py-16 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center mb-8">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Write in any language</h2>
          <p className="text-muted-foreground text-sm">Choose your preferred language on first launch. Switch any time.</p>
        </div>
        <div className="relative">
          <div className="flex gap-3 overflow-hidden">
            <div
              className="flex gap-3 shrink-0"
              style={{
                animation: "scroll-langs 30s linear infinite",
              }}
            >
              {[...LANGUAGES, ...LANGUAGES].map((lang, i) => (
                <span
                  key={i}
                  className="px-4 py-1.5 rounded-full border border-border bg-card text-sm font-medium text-foreground whitespace-nowrap shadow-sm"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes scroll-langs {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="font-serif text-4xl font-bold text-foreground mb-3">Simple pricing</h2>
          <p className="text-muted-foreground">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Free</p>
              <p className="font-serif text-4xl font-bold text-foreground">$0</p>
              <p className="text-xs text-muted-foreground mt-1">Forever free</p>
            </div>
            <ul className="space-y-2.5 mb-7 text-sm">
              {["Unlimited notes", "Lined paper editor", "Smart markdown paste", "Pin notes & sections", "Long-press rename & move", "Auto-save", "Print & export", "26 languages", "Install as app"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={appUrl}
              className="block w-full py-2.5 text-center rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm border border-border hover:bg-accent transition-colors"
            >
              Get started free
            </a>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-primary bg-card p-7 shadow-lg relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Most popular
              </span>
            </div>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Pro</p>
              <p className="font-serif text-4xl font-bold text-foreground">$6<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mt-1">Billed monthly</p>
            </div>
            <ul className="space-y-2.5 mb-7 text-sm">
              {[
                "Everything in Free",
                "Scan to text (AI vision OCR)",
                "AI writing assistant",
                "Voice dictation with AI cleanup",
                "Inline photos in notes",
                "Custom sections & ink colors",
                "Premium paper themes",
                "Shareable note links",
                "Priority support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={appUrl}
              className="block w-full py-2.5 text-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Start 7-day free trial
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-4xl font-bold text-primary-foreground mb-4">
            Ready to write?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Join writers who trust My AI Notebook to capture their best thinking.
          </p>
          <a
            href={appUrl}
            className="inline-block px-10 py-4 rounded-xl bg-background text-foreground font-bold text-base hover:opacity-95 transition-opacity shadow-lg"
          >
            Open My AI Notebook →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif text-lg italic text-foreground">My AI Notebook</span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href={appUrl} className="hover:text-foreground transition-colors">Open app</a>
          </div>
          <span className="text-xs text-muted-foreground">© 2025 My AI Notebook</span>
        </div>
      </footer>
    </div>
  );
}
