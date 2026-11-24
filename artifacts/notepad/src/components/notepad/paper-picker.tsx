import { Palette, PaintBucket, Lock, Check, Feather, Type } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export type PaperTheme =
  | "classic"
  | "legal-pad"
  | "college-white"
  | "graph"
  // 8 Sacred & Inspirational Stationeries (4 singles + 4 cut 4-ways)
  | "bom-lily-sunrise"
  | "christus-temple"
  | "shepherd-lambs"
  | "scriptures-lantern"
  | "risen-savior-olive"
  | "salt-lake-temple"
  | "pioneer-wagon"
  | "bom-temple-hill"
  // 10 Floral, Cute, Vintage & Coastal Stationeries
  | "lily-blue-morpho"
  | "lily-monarch-gold"
  | "blush-peony-frame"
  | "sage-gold-leaves"
  | "lavender-blossom-frame"
  | "peach-ribbon-hibiscus"
  | "vintage-hummingbird"
  | "tropical-seashell"
  | "kawaii-kitty-rainbow"
  | "anime-sakura-moon"
  // 8 AI & Cyber Circuit Stationeries (4 Dark Carbon CPU + 4 Light Parchment PCB)
  | "circuit-cpu-blue"
  | "circuit-cpu-gold"
  | "circuit-cpu-green"
  | "circuit-cpu-red"
  | "circuit-paper-blue"
  | "circuit-paper-purple"
  | "circuit-paper-green"
  | "circuit-paper-amber"
  // 12 Nautical, Explorer, Gothic & Executive Stationeries
  | "sunset-sailboats"
  | "lakeside-lantern"
  | "compass-voyage"
  | "northstar-valley"
  | "mountain-river-pines"
  | "obsidian-gold-crest"
  | "cyberpunk-neon-hex"
  | "gothic-silver-skull"
  | "desert-skulls-parchment"
  | "leather"
  | "mahogany"
  | "midnight"
  // Legacy compatibility IDs preserved so old saved notes never break
  | "parchment"
  | "blush-peony"
  | "sakura-washi"
  | "lavender"
  | "wildflower"
  | "watercolor"
  | "rosegold-marble"
  | "lily-gold-corner"
  | "lily-wrap"
  | "titanium"
  | "nordic-forest"
  | "circuit"
  | "circuit-stars"
  | "rose"
  | "mint"
  | "floral"
  | "lily-corner"
  | "lily-gold-wrap"
  | "circuit-corners"
  | "circuit-burst"
  | "circuit-hex"
  | "circuit-aura"
  | "circuit-frame";

export type LineStyle = "lined" | "dotted" | "blank";

interface ThemeDef {
  id: PaperTheme;
  name: string;
  category: "lined" | "sacred" | "feminine" | "cyber" | "masculine";
  bg: string;
  rule: string;
  ink: string;
  swatchImg?: string;
  isPro: boolean;
}

export const THEMES: ThemeDef[] = [
  // ── 1–4: Standard Lined & Pads (Default = Classic Lined) ──
  { id: "classic",                 name: "Classic Lined",     category: "lined",     bg: "#fdf6ec", rule: "#a8c4d8", ink: "#2a2118", isPro: false },
  { id: "legal-pad",               name: "Canary Legal",      category: "lined",     bg: "#fff8d6", rule: "#94b8d8", ink: "#241d12", isPro: false },
  { id: "college-white",           name: "College White",     category: "lined",     bg: "#ffffff", rule: "#9ec2e6", ink: "#18202c", isPro: false },
  { id: "graph",                   name: "Blueprint Pad",     category: "lined",     bg: "#f4f8fb", rule: "#5082b4", ink: "#1a2840", isPro: false },

  // ── 5–12: Sacred & Inspirational Collection (8 Custom Sheets) ──
  { id: "bom-lily-sunrise",        name: "Book of Mormon",    category: "sacred",    bg: "#f7f3ec", rule: "#c4a468", ink: "#281e12", swatchImg: "/themes/bom-lily-sunrise.jpg",        isPro: false },
  { id: "christus-temple",         name: "Christus & Temple", category: "sacred",    bg: "#faf4ea", rule: "#c4a468", ink: "#281d12", swatchImg: "/themes/christus-temple.jpg",         isPro: false },
  { id: "shepherd-lambs",          name: "Savior & Lambs",    category: "sacred",    bg: "#faf4eb", rule: "#c4a468", ink: "#2a1f14", swatchImg: "/themes/shepherd-lambs.jpg",          isPro: false },
  { id: "scriptures-lantern",      name: "Study Lantern",     category: "sacred",    bg: "#f6efe2", rule: "#c2a268", ink: "#2b1e10", swatchImg: "/themes/scriptures-lantern.jpg",      isPro: false },
  { id: "risen-savior-olive",      name: "Risen Savior",      category: "sacred",    bg: "#fbf5ec", rule: "#c4a468", ink: "#2a1e12", swatchImg: "/themes/risen-savior-olive.jpg",      isPro: false },
  { id: "salt-lake-temple",        name: "Salt Lake Temple",  category: "sacred",    bg: "#fbf5ec", rule: "#c4a468", ink: "#281e12", swatchImg: "/themes/salt-lake-temple.jpg",        isPro: false },
  { id: "pioneer-wagon",           name: "Pioneer Trail",     category: "sacred",    bg: "#faf3e8", rule: "#c4a468", ink: "#2b1f12", swatchImg: "/themes/pioneer-wagon.jpg",           isPro: false },
  { id: "bom-temple-hill",         name: "Temple Sunrise",    category: "sacred",    bg: "#f8f3ec", rule: "#c4a468", ink: "#261d12", swatchImg: "/themes/bom-temple-hill.jpg",         isPro: false },

  // ── 13–22: Floral, Cute, Vintage & Coastal Personas (10 Custom Sheets) ──
  { id: "lily-blue-morpho",        name: "Lily & Blue Morpho",category: "feminine",  bg: "#fffdf9", rule: "#baa068", ink: "#262018", swatchImg: "/themes/lily-blue-morpho.jpg",        isPro: false },
  { id: "lily-monarch-gold",       name: "Lily & Monarchs",   category: "feminine",  bg: "#faf9f4", rule: "#b2985c", ink: "#242118", swatchImg: "/themes/lily-monarch-gold.jpg",       isPro: false },
  { id: "blush-peony-frame",       name: "Blush Peony",       category: "feminine",  bg: "#fdf4f6", rule: "#d8a4b0", ink: "#3a1f28", swatchImg: "/themes/blush-peony-frame.jpg",       isPro: false },
  { id: "sage-gold-leaves",        name: "Sage & Gold",       category: "feminine",  bg: "#fcf9f2", rule: "#b5ab88", ink: "#283022", swatchImg: "/themes/sage-gold-leaves.jpg",        isPro: false },
  { id: "lavender-blossom-frame",  name: "Lavender Bloom",    category: "feminine",  bg: "#f8f2fc", rule: "#b89cd4", ink: "#2e1d44", swatchImg: "/themes/lavender-blossom-frame.jpg",  isPro: false },
  { id: "peach-ribbon-hibiscus",   name: "Peach Ribbon",      category: "feminine",  bg: "#fdf7ef", rule: "#d4ab92", ink: "#38231a", swatchImg: "/themes/peach-ribbon-hibiscus.jpg",   isPro: false },
  { id: "vintage-hummingbird",     name: "Hummingbird",       category: "feminine",  bg: "#f7ecd4", rule: "#b89868", ink: "#332210", swatchImg: "/themes/vintage-hummingbird.jpg",     isPro: false },
  { id: "tropical-seashell",       name: "Seashell Beach",    category: "feminine",  bg: "#eefafe", rule: "#7cc2d8", ink: "#123040", swatchImg: "/themes/tropical-seashell.jpg",       isPro: false },
  { id: "kawaii-kitty-rainbow",    name: "Kitty Rainbow",     category: "feminine",  bg: "#fdf2fb", rule: "#d8a8dc", ink: "#3b1e46", swatchImg: "/themes/kawaii-kitty-rainbow.jpg",    isPro: false },
  { id: "anime-sakura-moon",       name: "Sakura Moon",       category: "feminine",  bg: "#fbf2fc", rule: "#cfa2dc", ink: "#321b42", swatchImg: "/themes/anime-sakura-moon.jpg",       isPro: false },

  // ── 21–28: AI & Cyber Circuit Collection (4 Dark Carbon CPU + 4 Light PCB) ──
  { id: "circuit-cpu-blue",        name: "Electric CPU",      category: "cyber",     bg: "#121a26", rule: "#3898e8", ink: "#eef6ff", swatchImg: "/themes/circuit-cpu-blue.jpg",        isPro: false },
  { id: "circuit-cpu-gold",        name: "Gold Sovereign CPU",category: "cyber",     bg: "#191610", rule: "#d8a838", ink: "#fff8e6", swatchImg: "/themes/circuit-cpu-gold.jpg",        isPro: false },
  { id: "circuit-cpu-green",       name: "Matrix CPU",        category: "cyber",     bg: "#101c13", rule: "#34c85a", ink: "#ecfff0", swatchImg: "/themes/circuit-cpu-green.jpg",       isPro: false },
  { id: "circuit-cpu-red",         name: "Crimson CPU",       category: "cyber",     bg: "#1d1112", rule: "#df4040", ink: "#fff0f0", swatchImg: "/themes/circuit-cpu-red.jpg",         isPro: false },
  { id: "circuit-paper-blue",      name: "Cobalt PCB",        category: "cyber",     bg: "#faf5ea", rule: "#5690c8", ink: "#16263b", swatchImg: "/themes/circuit-paper-blue.jpg",      isPro: false },
  { id: "circuit-paper-purple",    name: "Violet Gold PCB",   category: "cyber",     bg: "#faf2e4", rule: "#8c62b8", ink: "#241638", swatchImg: "/themes/circuit-paper-purple.jpg",    isPro: false },
  { id: "circuit-paper-green",     name: "Emerald PCB",       category: "cyber",     bg: "#f5f4ea", rule: "#4c8c64", ink: "#162a1c", swatchImg: "/themes/circuit-paper-green.jpg",     isPro: false },
  { id: "circuit-paper-amber",     name: "Copper Gold PCB",   category: "cyber",     bg: "#fbf0df", rule: "#b88238", ink: "#2c1b08", swatchImg: "/themes/circuit-paper-amber.jpg",     isPro: false },

  // ── 29–40: Nautical, Explorer, Gothic & Executive Personas ──
  { id: "sunset-sailboats",        name: "Sunset Sails",      category: "masculine", bg: "#f9f3ea", rule: "#8ca8c4", ink: "#1d2838", swatchImg: "/themes/sunset-sailboats.jpg",        isPro: false },
  { id: "lakeside-lantern",        name: "Lakeside Lantern",  category: "masculine", bg: "#f4eadc", rule: "#b89668", ink: "#281c10", swatchImg: "/themes/lakeside-lantern.jpg",        isPro: false },
  { id: "compass-voyage",          name: "Compass Voyage",    category: "masculine", bg: "#f7eedf", rule: "#a88d64", ink: "#281d10", swatchImg: "/themes/compass-voyage.jpg",          isPro: false },
  { id: "northstar-valley",        name: "North Star",        category: "masculine", bg: "#f8f1e4", rule: "#a8926a", ink: "#241d12", swatchImg: "/themes/northstar-valley.jpg",        isPro: false },
  { id: "mountain-river-pines",    name: "Mountain Pines",    category: "masculine", bg: "#faf3e3", rule: "#9c8b68", ink: "#1e2b1e", swatchImg: "/themes/mountain-river-pines.jpg",    isPro: false },
  { id: "obsidian-gold-crest",     name: "Gold & Obsidian",   category: "masculine", bg: "#f8eedc", rule: "#b89658", ink: "#261c0e", swatchImg: "/themes/obsidian-gold-crest.jpg",     isPro: false },
  { id: "cyberpunk-neon-hex",      name: "Cyberpunk Neon",    category: "masculine", bg: "#f3eefc", rule: "#8c7cd6", ink: "#1c1638", swatchImg: "/themes/cyberpunk-neon-hex.jpg",      isPro: false },
  { id: "gothic-silver-skull",     name: "Silver Skull",      category: "masculine", bg: "#eceef2", rule: "#8c929c", ink: "#181a20", swatchImg: "/themes/gothic-silver-skull.jpg",     isPro: false },
  { id: "desert-skulls-parchment", name: "Desert Skulls",     category: "masculine", bg: "#f3e7d2", rule: "#a88e68", ink: "#2b1f12", swatchImg: "/themes/desert-skulls-parchment.jpg", isPro: false },
  { id: "leather",                 name: "Saddle Leather",    category: "masculine", bg: "#291b12", rule: "#dcb478", ink: "#f6ead4", swatchImg: "/themes/saddle-leather.jpg",          isPro: false },
  { id: "mahogany",                name: "Mahogany Brass",    category: "masculine", bg: "#24130a", rule: "#d4af6a", ink: "#f7ecd8", swatchImg: "/themes/mahogany-brass.jpg",          isPro: false },
  { id: "midnight",                name: "Deep Cosmos",       category: "masculine", bg: "#0b101d", rule: "#7ba0d6", ink: "#ebf2fc", swatchImg: "/themes/starfield-cosmos.jpg",        isPro: false },
];

export interface InkColorDef {
  id: string;
  name: string;
  value: string;
}

export const INK_COLORS: InkColorDef[] = [
  { id: "auto",       name: "Auto",         value: "" },
  { id: "white",      name: "Pure White",   value: "#ffffff" },
  { id: "ivory",      name: "Ivory Cream",  value: "#fff8dc" },
  { id: "silver",     name: "Silver",       value: "#cbd5e1" },
  { id: "black",      name: "Jet Black",    value: "#141414" },
  { id: "brightgold", name: "Bright Gold",  value: "#f5c542" },
  { id: "gold",       name: "Antique Gold", value: "#d4a017" },
  { id: "coral",      name: "Coral",        value: "#fb923c" },
  { id: "rose",       name: "Rose Pink",    value: "#ec4899" },
  { id: "crimson",    name: "Crimson",      value: "#dc2626" },
  { id: "burgundy",   name: "Burgundy",     value: "#9f1239" },
  { id: "sky",        name: "Sky Ice",      value: "#7dd3fc" },
  { id: "cyan",       name: "Cyan",         value: "#22d3ee" },
  { id: "royal",      name: "Royal Blue",   value: "#2563eb" },
  { id: "navy",       name: "Navy",         value: "#1e3a8a" },
  { id: "mint",       name: "Mint",         value: "#34d399" },
  { id: "teal",       name: "Teal",         value: "#0d9488" },
  { id: "forest",     name: "Forest",       value: "#166534" },
  { id: "lavender",   name: "Lavender",     value: "#c084fc" },
  { id: "purple",     name: "Purple",       value: "#7c3aed" },
  { id: "sepia",      name: "Sepia",        value: "#92400e" },
];

export const PAGE_COLORS: InkColorDef[] = [
  { id: "stationery", name: "Stationery",   value: "" },
  { id: "white",      name: "Pure White",   value: "#ffffff" },
  { id: "cream",      name: "Warm Cream",   value: "#fdf6ec" },
  { id: "ivory",      name: "Soft Ivory",   value: "#faf3e0" },
  { id: "black",      name: "Pitch Black",  value: "#0a0a0c" },
  { id: "charcoal",   name: "Charcoal",     value: "#1e1e24" },
  { id: "slate",      name: "Slate",        value: "#334155" },
  { id: "midnight",   name: "Midnight",     value: "#0f172a" },
  { id: "deepforest", name: "Deep Forest",  value: "#0d261a" },
  { id: "wine",       name: "Wine",         value: "#3b0a18" },
  { id: "plum",       name: "Royal Plum",   value: "#28103e" },
  { id: "espresso",   name: "Espresso",     value: "#24160e" },
  { id: "canary",     name: "Canary",       value: "#fef9c3" },
  { id: "blush",      name: "Blush Pink",   value: "#fce7f3" },
  { id: "lavender",   name: "Lavender",     value: "#f3e8ff" },
  { id: "skymist",    name: "Sky Mist",     value: "#e0f2fe" },
  { id: "mintsage",   name: "Mint Sage",    value: "#dcfce7" },
  { id: "sand",       name: "Warm Sand",    value: "#e7dcc8" },
  { id: "peach",      name: "Soft Peach",   value: "#ffedd5" },
  { id: "tealnight",  name: "Deep Teal",    value: "#0a2629" },
];

export function isDarkHexColor(hex: string): boolean {
  const clean = (hex || "").trim().replace(/^#/, "");
  if (clean.length !== 3 && clean.length !== 6) return false;
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.45;
}

export const LINE_STYLES: { id: LineStyle; name: string; isPro: boolean }[] = [
  { id: "lined",  name: "Lined",  isPro: false },
  { id: "dotted", name: "Dotted", isPro: false },
  { id: "blank",  name: "Blank",  isPro: false },
];

export interface FontDef {
  id: string;
  name: string;
  stack: string;
  isPro: boolean;
}

export const FONTS: FontDef[] = [
  { id: "default",     name: "Default",     stack: "",                                  isPro: false },
  { id: "oldenglish",  name: "Old English", stack: "'UnifrakturMaguntia', cursive",     isPro: false },
  { id: "gothic",      name: "Gothic",      stack: "'Pirata One', system-ui, cursive",  isPro: false },
  { id: "script",      name: "Script",      stack: "'Dancing Script', cursive",         isPro: false },
  { id: "handwriting", name: "Handwriting", stack: "'Caveat', cursive",                 isPro: false },
  { id: "typewriter",  name: "Typewriter",  stack: "'Special Elite', monospace",        isPro: false },
  { id: "elegant",     name: "Elegant",     stack: "'Playfair Display', serif",         isPro: false },
  { id: "bold",        name: "Bold Script", stack: "'Lobster', cursive",                isPro: false },
  { id: "roman",       name: "Roman",       stack: "'Cinzel', serif",                   isPro: false },
];

interface PaperPickerProps {
  theme: PaperTheme;
  lineStyle: LineStyle;
  isPro: boolean;
  compact?: boolean;
  onThemeChange: (theme: PaperTheme) => void;
  onLineStyleChange: (style: LineStyle) => void;
  onLockedClick: () => void;
}

interface InkColorPickerProps {
  inkColor: string;
  isPro: boolean;
  compact?: boolean;
  onInkColorChange: (color: string) => void;
  onLockedClick: () => void;
}

function ThemeSwatch({
  theme,
  selected,
  locked,
  onClick,
}: {
  theme: ThemeDef;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const isLegalPad = theme.id === "legal-pad";

  return (
    <button
      onClick={onClick}
      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
      }`}
      title={theme.name}
      data-testid={`theme-${theme.id}`}
    >
      <div className="h-14 w-full relative" style={{ backgroundColor: theme.bg }}>
        {theme.swatchImg && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${theme.swatchImg}?v=3")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        {isLegalPad && (
          <div
            className="absolute top-0 bottom-0 left-2.5 w-px"
            style={{ backgroundColor: "rgba(220, 80, 80, 0.55)" }}
          />
        )}
        {!theme.swatchImg && (
          <>
            <div className="absolute inset-1 flex flex-col gap-1 justify-center">
              <div className="h-px w-3/4 mx-auto" style={{ backgroundColor: theme.rule, opacity: 0.8 }} />
              <div className="h-px w-3/4 mx-auto" style={{ backgroundColor: theme.rule, opacity: 0.8 }} />
              <div className="h-px w-3/4 mx-auto" style={{ backgroundColor: theme.rule, opacity: 0.8 }} />
            </div>
            <div
              className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: theme.ink, opacity: 0.6 }}
            />
          </>
        )}
        {locked && (
          <div className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5">
            <Lock className="h-2.5 w-2.5 text-primary" />
          </div>
        )}
        {selected && (
          <div className="absolute bottom-0.5 right-0.5 bg-primary rounded-full p-0.5">
            <Check className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="text-[10px] py-0.5 px-1 text-center bg-background text-foreground font-medium truncate">
        {theme.name}
      </div>
    </button>
  );
}

export function PaperPicker({
  theme,
  lineStyle,
  isPro,
  compact = false,
  onThemeChange,
  onLineStyleChange,
  onLockedClick,
}: PaperPickerProps) {
  const handleThemePick = (t: ThemeDef) => {
    if (t.isPro && !isPro) {
      onLockedClick();
      return;
    }
    onThemeChange(t.id);
  };

  const handleLinePick = (l: (typeof LINE_STYLES)[number]) => {
    if (l.isPro && !isPro) {
      onLockedClick();
      return;
    }
    onLineStyleChange(l.id);
  };

  const groups: Array<{ key: ThemeDef["category"]; label: string }> = [
    { key: "lined",     label: "Standard Lined & Pads" },
    { key: "sacred",    label: "Sacred & Inspirational" },
    { key: "feminine",  label: "Floral, Cute, Vintage & Coastal" },
    { key: "cyber",     label: "AI & Cyber Circuit Collection" },
    { key: "masculine", label: "Nautical, Explorer, Gothic & Executive" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 text-xs ${compact ? "px-1.5" : "gap-1.5"}`}
          title="Paper style"
          data-testid="button-paper-picker"
        >
          <Palette className="h-3.5 w-3.5" />
          <span className={compact ? "hidden" : "hidden sm:inline"}>Paper</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-84 max-h-[82vh] overflow-y-auto p-3" align="end">
        <div className="space-y-3">
          {groups.map((grp) => (
            <div key={grp.key}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {grp.label}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {THEMES.filter((t) => t.category === grp.key).map((t) => (
                  <ThemeSwatch
                    key={t.id}
                    theme={t}
                    selected={theme === t.id}
                    locked={t.isPro && !isPro}
                    onClick={() => handleThemePick(t)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="h-px bg-border" />

          {/* Line style */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Line Style
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {LINE_STYLES.map((l) => {
                const selected = lineStyle === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => handleLinePick(l)}
                    className={`relative h-12 rounded-lg border-2 transition-all bg-background flex items-center justify-center ${
                      selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    }`}
                    title={l.name}
                    data-testid={`line-${l.id}`}
                  >
                    {l.id === "lined" && (
                      <div className="w-3/4 space-y-1.5">
                        <div className="h-px bg-foreground/40" />
                        <div className="h-px bg-foreground/40" />
                        <div className="h-px bg-foreground/40" />
                      </div>
                    )}
                    {l.id === "dotted" && (
                      <div className="w-3/4 grid grid-cols-6 gap-x-1 gap-y-1.5">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <div key={i} className="h-0.5 w-0.5 rounded-full bg-foreground/40 mx-auto" />
                        ))}
                      </div>
                    )}
                    {l.id === "blank" && (
                      <span className="text-[9px] text-muted-foreground italic">blank</span>
                    )}
                    {selected && (
                      <div className="absolute bottom-0.5 right-0.5 bg-primary rounded-full p-0.5">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute -bottom-3.5 left-0 right-0 text-[9px] text-center text-muted-foreground font-medium">
                      {l.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-1" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface PageColorPickerProps {
  pageColor: string;
  isPro: boolean;
  compact?: boolean;
  onPageColorChange: (color: string) => void;
  onLockedClick: () => void;
}

export function PageColorPicker({
  pageColor,
  isPro,
  compact = false,
  onPageColorChange,
  onLockedClick,
}: PageColorPickerProps) {
  const handlePick = (c: InkColorDef) => {
    if (!isPro && c.id !== "stationery") {
      onLockedClick();
      return;
    }
    onPageColorChange(c.value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 text-xs ${compact ? "px-1.5" : "gap-1.5"}`}
          title="Solid page background color"
          data-testid="button-page-color-picker"
        >
          <PaintBucket
            className="h-3.5 w-3.5"
            style={
              pageColor
                ? {
                    color:
                      pageColor.toLowerCase() === "#ffffff" ? "#64748b" : pageColor,
                  }
                : undefined
            }
          />
          <span className={compact ? "hidden" : "hidden sm:inline"}>Page Color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Page Color
            </p>
            {pageColor && (
              <button
                type="button"
                onClick={() => onPageColorChange("")}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Use Stationery
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {PAGE_COLORS.map((c) => {
              const selected = (pageColor || "") === c.value;
              const isDefault = c.id === "stationery";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handlePick(c)}
                  title={c.name}
                  data-testid={`page-color-${c.id}`}
                  className={`relative h-10 rounded-md border-2 transition-all flex items-center justify-center overflow-hidden ${
                    selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                  }`}
                  style={
                    isDefault
                      ? {
                          background:
                            "linear-gradient(135deg, #fdf6ec 0%, #fdf6ec 50%, #dbeafe 50%, #dbeafe 100%)",
                        }
                      : { backgroundColor: c.value }
                  }
                >
                  {isDefault && (
                    <span className="text-[9px] font-bold text-foreground/80 bg-white/75 px-1 rounded">
                      Auto
                    </span>
                  )}
                  {selected && (
                    <div className="absolute bottom-0.5 right-0.5 bg-white rounded-full p-0.5 shadow border border-black/10">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Any-Color Picker */}
          <label className="flex items-center justify-between gap-2 pt-1.5 border-t border-border cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            <span>Custom page color…</span>
            <input
              type="color"
              value={pageColor || "#0a0a0c"}
              onChange={(e) => onPageColorChange(e.target.value)}
              className="h-6 w-9 rounded border border-border cursor-pointer bg-transparent p-0"
              data-testid="input-custom-page-color"
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function InkColorPicker({ inkColor, isPro, compact = false, onInkColorChange, onLockedClick }: InkColorPickerProps) {
  const handleInkPick = (c: InkColorDef) => {
    if (!isPro && c.id !== "auto") {
      onLockedClick();
      return;
    }
    onInkColorChange(c.value);
  };

  const currentInk = inkColor || undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 text-xs ${compact ? "px-1.5" : "gap-1.5"}`}
          title="Text / Ink color"
          data-testid="button-ink-picker"
        >
          <Feather
            className="h-3.5 w-3.5"
            style={
              currentInk
                ? {
                    color:
                      currentInk.toLowerCase() === "#ffffff" ? "#94a3b8" : currentInk,
                  }
                : undefined
            }
          />
          <span className={compact ? "hidden" : "hidden sm:inline"}>Ink</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Text / Ink Color
            </p>
            {inkColor && (
              <button
                type="button"
                onClick={() => onInkColorChange("")}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Reset Auto
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {INK_COLORS.map((c) => {
              const selected = (inkColor || "") === c.value;
              const locked = !isPro && c.id !== "auto";
              const isAuto = c.id === "auto";
              const isWhite = c.id === "white";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleInkPick(c)}
                  title={c.name}
                  data-testid={`ink-${c.id}`}
                  className={`relative h-10 rounded-md border-2 transition-all flex items-center justify-center overflow-hidden ${
                    selected
                      ? "border-primary ring-2 ring-primary/30"
                      : isWhite
                      ? "border-slate-300 hover:border-primary/60"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={
                    isAuto
                      ? {
                          background:
                            "linear-gradient(135deg, #ffffff 0%, #ffffff 50%, #1e293b 50%, #1e293b 100%)",
                        }
                      : { backgroundColor: c.value }
                  }
                >
                  {isAuto && (
                    <span className="text-[9px] font-bold text-foreground bg-white/85 px-1 rounded shadow-2xs">
                      Auto
                    </span>
                  )}
                  {isWhite && !selected && (
                    <span className="text-[9px] font-semibold text-slate-500">White</span>
                  )}
                  {selected && !locked && (
                    <div className="absolute bottom-0.5 right-0.5 bg-white rounded-full p-0.5 shadow border border-black/15">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Any-Color Picker */}
          <label className="flex items-center justify-between gap-2 pt-1.5 border-t border-border cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            <span>Custom text color…</span>
            <input
              type="color"
              value={inkColor || "#ffffff"}
              onChange={(e) => onInkColorChange(e.target.value)}
              className="h-6 w-9 rounded border border-border cursor-pointer bg-transparent p-0"
              data-testid="input-custom-ink-color"
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FontPickerProps {
  font: string;
  isPro: boolean;
  compact?: boolean;
  onFontChange: (stack: string) => void;
  onLockedClick: () => void;
}

export function FontPicker({ font, isPro, compact = false, onFontChange, onLockedClick }: FontPickerProps) {
  const handleFontPick = (f: FontDef) => {
    if (f.isPro && !isPro) {
      onLockedClick();
      return;
    }
    onFontChange(f.stack);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 text-xs ${compact ? "px-1.5" : "gap-1.5"}`}
          title="Font"
          data-testid="button-font-picker"
        >
          <Type className="h-3.5 w-3.5" />
          <span className={compact ? "hidden" : "hidden sm:inline"}>Font</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Font
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {FONTS.map((f) => {
              const selected = (font || "") === f.stack;
              return (
                <button
                  key={f.id}
                  onClick={() => handleFontPick(f)}
                  title={f.name}
                  data-testid={`font-${f.id}`}
                  className={`relative h-14 rounded-lg border-2 transition-all bg-background flex flex-col items-center justify-center px-1 ${
                    selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                  }`}
                >
                  <span
                    className="text-lg leading-none truncate max-w-full text-foreground"
                    style={f.stack ? { fontFamily: f.stack } : undefined}
                  >
                    Aa
                  </span>
                  <span className="text-[9px] mt-1 text-muted-foreground font-medium truncate max-w-full">
                    {f.name}
                  </span>
                  {selected && (
                    <div className="absolute bottom-0.5 right-0.5 bg-primary rounded-full p-0.5">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
