import { AIActionType, PaperRuling, StationeryTheme } from './types';

export interface WorldLanguageSpec {
  code: string;
  flag: string;
  nativeLabel: string;
  englishName: string;
  bcp47: string;
  rtl?: boolean;
}

export const WORLD_LANGUAGES: WorldLanguageSpec[] = [
  { code: 'en', flag: '🇺🇸', nativeLabel: 'English', englishName: 'English', bcp47: 'en-US' },
  { code: 'es', flag: '🇪🇸', nativeLabel: 'Español', englishName: 'Spanish', bcp47: 'es-ES' },
  { code: 'fr', flag: '🇫🇷', nativeLabel: 'Français', englishName: 'French', bcp47: 'fr-FR' },
  { code: 'de', flag: '🇩🇪', nativeLabel: 'Deutsch', englishName: 'German', bcp47: 'de-DE' },
  { code: 'pt', flag: '🇧🇷', nativeLabel: 'Português', englishName: 'Portuguese', bcp47: 'pt-BR' },
  { code: 'it', flag: '🇮🇹', nativeLabel: 'Italiano', englishName: 'Italian', bcp47: 'it-IT' },
  { code: 'nl', flag: '🇳🇱', nativeLabel: 'Nederlands', englishName: 'Dutch', bcp47: 'nl-NL' },
  { code: 'pl', flag: '🇵🇱', nativeLabel: 'Polski', englishName: 'Polish', bcp47: 'pl-PL' },
  { code: 'sv', flag: '🇸🇪', nativeLabel: 'Svenska', englishName: 'Swedish', bcp47: 'sv-SE' },
  { code: 'no', flag: '🇳🇴', nativeLabel: 'Norsk', englishName: 'Norwegian', bcp47: 'nb-NO' },
  { code: 'da', flag: '🇩🇰', nativeLabel: 'Dansk', englishName: 'Danish', bcp47: 'da-DK' },
  { code: 'fi', flag: '🇫🇮', nativeLabel: 'Suomi', englishName: 'Finnish', bcp47: 'fi-FI' },
  { code: 'el', flag: '🇬🇷', nativeLabel: 'Ελληνικά', englishName: 'Greek', bcp47: 'el-GR' },
  { code: 'cs', flag: '🇨🇿', nativeLabel: 'Čeština', englishName: 'Czech', bcp47: 'cs-CZ' },
  { code: 'ro', flag: '🇷🇴', nativeLabel: 'Română', englishName: 'Romanian', bcp47: 'ro-RO' },
  { code: 'hu', flag: '🇭🇺', nativeLabel: 'Magyar', englishName: 'Hungarian', bcp47: 'hu-HU' },
  { code: 'uk', flag: '🇺🇦', nativeLabel: 'Українська', englishName: 'Ukrainian', bcp47: 'uk-UA' },
  { code: 'ru', flag: '🌍', nativeLabel: 'Русский', englishName: 'Russian', bcp47: 'ru-RU' },
  { code: 'tr', flag: '🇹🇷', nativeLabel: 'Türkçe', englishName: 'Turkish', bcp47: 'tr-TR' },
  { code: 'ar', flag: '🇸🇦', nativeLabel: 'العربية', englishName: 'Arabic', bcp47: 'ar-SA', rtl: true },
  { code: 'he', flag: '🇮🇱', nativeLabel: 'עברית', englishName: 'Hebrew', bcp47: 'he-IL', rtl: true },
  { code: 'fa', flag: '🌍', nativeLabel: 'فارسی', englishName: 'Persian', bcp47: 'fa-IR', rtl: true },
  { code: 'ur', flag: '🇵🇰', nativeLabel: 'اردو', englishName: 'Urdu', bcp47: 'ur-PK', rtl: true },
  { code: 'hi', flag: '🇮🇳', nativeLabel: 'हिन्दी', englishName: 'Hindi', bcp47: 'hi-IN' },
  { code: 'bn', flag: '🇧🇩', nativeLabel: 'বাংলা', englishName: 'Bengali', bcp47: 'bn-IN' },
  { code: 'pa', flag: '🇮🇳', nativeLabel: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', bcp47: 'pa-IN' },
  { code: 'ta', flag: '🇮🇳', nativeLabel: 'தமிழ்', englishName: 'Tamil', bcp47: 'ta-IN' },
  { code: 'te', flag: '🇮🇳', nativeLabel: 'తెలుగు', englishName: 'Telugu', bcp47: 'te-IN' },
  { code: 'mr', flag: '🇮🇳', nativeLabel: 'मराठी', englishName: 'Marathi', bcp47: 'mr-IN' },
  { code: 'gu', flag: '🇮🇳', nativeLabel: 'ગુજરાતી', englishName: 'Gujarati', bcp47: 'gu-IN' },
  { code: 'th', flag: '🇹🇭', nativeLabel: 'ไทย', englishName: 'Thai', bcp47: 'th-TH' },
  { code: 'vi', flag: '🇻🇳', nativeLabel: 'Tiếng Việt', englishName: 'Vietnamese', bcp47: 'vi-VN' },
  { code: 'id', flag: '🇮🇩', nativeLabel: 'Bahasa Indonesia', englishName: 'Indonesian', bcp47: 'id-ID' },
  { code: 'ms', flag: '🇲🇾', nativeLabel: 'Bahasa Melayu', englishName: 'Malay', bcp47: 'ms-MY' },
  { code: 'tl', flag: '🇵🇭', nativeLabel: 'Tagalog', englishName: 'Tagalog / Filipino', bcp47: 'fil-PH' },
  { code: 'sw', flag: '🇰🇪', nativeLabel: 'Kiswahili', englishName: 'Swahili', bcp47: 'sw-KE' },
  { code: 'af', flag: '🇿🇦', nativeLabel: 'Afrikaans', englishName: 'Afrikaans', bcp47: 'af-ZA' },
  { code: 'zu', flag: '🇿🇦', nativeLabel: 'isiZulu', englishName: 'Zulu', bcp47: 'zu-ZA' },
  { code: 'am', flag: '🇪🇹', nativeLabel: 'አማርኛ', englishName: 'Amharic', bcp47: 'am-ET' },
  { code: 'ja', flag: '🇯🇵', nativeLabel: '日本語', englishName: 'Japanese', bcp47: 'ja-JP' },
  { code: 'ko', flag: '🇰🇷', nativeLabel: '한국어', englishName: 'Korean', bcp47: 'ko-KR' },
  { code: 'zh', flag: '🇨🇳', nativeLabel: '简体中文', englishName: 'Chinese (Simplified)', bcp47: 'zh-CN' },
  { code: 'zh-tw', flag: '🇹🇼', nativeLabel: '繁體中文', englishName: 'Chinese (Traditional)', bcp47: 'zh-TW' },
];

export function detectInitialWorldLanguage(): WorldLanguageSpec {
  try {
    const saved = localStorage.getItem('AETHER_NOTEBOOK_LANG');
    if (saved) {
      const hit = WORLD_LANGUAGES.find((l) => l.code === saved);
      if (hit) return hit;
    }
  } catch {}
  const raw = String(typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US').toLowerCase();
  if (raw.startsWith('zh-tw') || raw.startsWith('zh-hk')) {
    return WORLD_LANGUAGES.find((l) => l.code === 'zh-tw') || WORLD_LANGUAGES[0];
  }
  const base = raw.split(/[-_]/)[0];
  if (base === 'fil') return WORLD_LANGUAGES.find((l) => l.code === 'tl') || WORLD_LANGUAGES[0];
  if (base === 'nb' || base === 'nn') return WORLD_LANGUAGES.find((l) => l.code === 'no') || WORLD_LANGUAGES[0];
  return WORLD_LANGUAGES.find((l) => l.code === base) || WORLD_LANGUAGES[0];
}

export interface UILabels {
  notebooks: string;
  newNotebook: string;
  importBtn: string;
  stationeryTitle: string;
  paperRuling: string;
  photoOpacity: string;
  done: string;
  craftExpand: string;
  polish: string;
  summarize: string;
  brainstorm: string;
  translate: string;
  generate: string;
  addCode: string;
  addAether: string;
  addText: string;
  addPhoto: string;
  aetherPromptPlaceholder: string;
  notePlaceholder: string;
}

const UI_TRANSLATIONS: Record<string, Partial<UILabels>> = {
  es: {
    notebooks: 'Cuadernos', newNotebook: 'Nuevo Cuaderno', importBtn: 'Importar',
    stationeryTitle: 'Papelería de Lujo', paperRuling: 'Rayado del Papel', photoOpacity: 'Opacidad del Fondo', done: 'Listo',
    craftExpand: '✍️ Crear / Expandir', polish: '✨ Pulir', summarize: '📝 Resumir', brainstorm: '💡 Ideas', translate: '🌍 Traducir',
    generate: 'Crear con Aether', addCode: '+ Código', addAether: '+ Aether IA', addText: '+ Nota', addPhoto: '+ Foto',
    aetherPromptPlaceholder: 'Pide a Aether redactar cualquier texto, idea, carta, cálculo o código...',
    notePlaceholder: 'Escribe tus notas en cualquier idioma...',
  },
  fr: {
    notebooks: 'Carnets', newNotebook: 'Nouveau Carnet', importBtn: 'Importer',
    stationeryTitle: 'Papeterie de Luxe', paperRuling: 'Réglure du Papier', photoOpacity: 'Opacité Photo', done: 'Terminé',
    craftExpand: '✍️ Rédiger', polish: '✨ Sublimer', summarize: '📝 Résumer', brainstorm: '💡 Idées', translate: '🌍 Traduire',
    generate: 'Créer avec Aether', addCode: '+ Code', addAether: '+ Aether IA', addText: '+ Texte', addPhoto: '+ Photo',
    aetherPromptPlaceholder: 'Demandez à Aether de rédiger, structurer, calculer ou coder...',
    notePlaceholder: 'Écrivez vos notes dans votre langue...',
  },
  de: {
    notebooks: 'Notizbücher', newNotebook: 'Neues Notizbuch', importBtn: 'Importieren',
    stationeryTitle: 'Luxus-Briefpapier', paperRuling: 'Lineatur', photoOpacity: 'Foto-Deckkraft', done: 'Fertig',
    craftExpand: '✍️ Ausarbeiten', polish: '✨ Verfeinern', summarize: '📝 Zusammenfassen', brainstorm: '💡 Ideen', translate: '🌍 Übersetzen',
    generate: 'Mit Aether erstellen', addCode: '+ Code', addAether: '+ Aether KI', addText: '+ Text', addPhoto: '+ Foto',
    aetherPromptPlaceholder: 'Bitte Aether, Texte, Konzepte, Formeln oder Code zu entwerfen...',
    notePlaceholder: 'Notizen in jeder Sprache schreiben...',
  },
  pt: {
    notebooks: 'Cadernos', newNotebook: 'Novo Caderno', importBtn: 'Importar',
    stationeryTitle: 'Papelaria de Luxo', paperRuling: 'Pauta do Papel', photoOpacity: 'Opacidade da Foto', done: 'Concluir',
    craftExpand: '✍️ Criar / Expandir', polish: '✨ Refinar', summarize: '📝 Resumir', brainstorm: '💡 Ideias', translate: '🌍 Traduzir',
    generate: 'Criar com Aether', addCode: '+ Código', addAether: '+ Aether IA', addText: '+ Nota', addPhoto: '+ Foto',
    aetherPromptPlaceholder: 'Peça ao Aether para escrever, planejar, traduzir ou programar...',
    notePlaceholder: 'Digite suas notas em qualquer idioma...',
  },
  it: {
    notebooks: 'Taccuini', newNotebook: 'Nuovo Taccuino', importBtn: 'Importa',
    stationeryTitle: 'Carta Pregiata', paperRuling: 'Rigatura Carta', photoOpacity: 'Opacità Foto', done: 'Fatto',
    craftExpand: '✍️ Scrivi / Espandi', polish: '✨ Perfeziona', summarize: '📝 Riassumi', brainstorm: '💡 Idee', translate: '🌍 Traduci',
    generate: 'Crea con Aether', addCode: '+ Codice', addAether: '+ Aether IA', addText: '+ Testo', addPhoto: '+ Foto',
    aetherPromptPlaceholder: 'Chiedi ad Aether di scrivere qualsiasi testo, progetto o codice...',
    notePlaceholder: 'Scrivi appunti in qualsiasi lingua...',
  },
  ja: {
    notebooks: 'ノート一覧', newNotebook: '新規ノート', importBtn: '読込',
    stationeryTitle: '高級ステーショナリー（用紙）', paperRuling: '罫線スタイル', photoOpacity: '背景の透明度', done: '完了',
    craftExpand: '✍️ 執筆・展開', polish: '✨ 推敲', summarize: '📝 要約', brainstorm: '💡 アイデア', translate: '🌍 翻訳',
    generate: 'Aetherで作成', addCode: '+ コード', addAether: '+ Aether AI', addText: '+ テキスト', addPhoto: '+ 写真',
    aetherPromptPlaceholder: '文章作成・企画・計算・プログラムなど何でもAetherにお任せください...',
    notePlaceholder: 'どの言語でも自由にメモを入力できます...',
  },
  ko: {
    notebooks: '노트북 목록', newNotebook: '새 노트북', importBtn: '가져오기',
    stationeryTitle: '럭셔리 스테이셔너리 (속지)', paperRuling: '종이 줄무늬', photoOpacity: '배경 투명도', done: '완료',
    craftExpand: '✍️ 작성·확장', polish: '✨ 다듬기', summarize: '📝 요약', brainstorm: '💡 아이디어', translate: '🌍 번역',
    generate: 'Aether로 생성', addCode: '+ 코드', addAether: '+ Aether AI', addText: '+ 텍스트', addPhoto: '+ 사진',
    aetherPromptPlaceholder: '글쓰기, 기획, 요약, 수식, 코드 등 무엇이든 Aether에게 요청하세요...',
    notePlaceholder: '원하는 언어로 자유롭게 작성하세요...',
  },
  zh: {
    notebooks: '笔记本列表', newNotebook: '新建笔记本', importBtn: '导入',
    stationeryTitle: '高定信纸与纸张工坊', paperRuling: '纸张格线', photoOpacity: '背景透明度', done: '完成',
    craftExpand: '✍️ 创作/扩写', polish: '✨ 润色', summarize: '📝 总结', brainstorm: '💡 灵感', translate: '🌍 翻译',
    generate: 'Aether 生成', addCode: '+ 代码', addAether: '+ Aether AI', addText: '+ 笔记', addPhoto: '+ 照片',
    aetherPromptPlaceholder: '让 Aether 帮您撰写文章、策划方案、推导公式或编写代码...',
    notePlaceholder: '支持全球任意语言输入与语音听写...',
  },
  ar: {
    notebooks: 'الدفاتر', newNotebook: 'دفتر جديد', importBtn: 'استيراد',
    stationeryTitle: 'القرطاسية الفاخرة', paperRuling: 'تسطير الورق', photoOpacity: 'شفافية الخلفية', done: 'تم',
    craftExpand: '✍️ صياغة وتوسيع', polish: '✨ تحسين', summarize: '📝 تلخيص', brainstorm: '💡 أفكار', translate: '🌍 ترجمة',
    generate: 'إنشاء بواسطة Aether', addCode: '+ برمجة', addAether: '+ ذكاء Aether', addText: '+ نص', addPhoto: '+ صورة',
    aetherPromptPlaceholder: 'اطلب من Aether كتابة أي نص أو خطة أو معادلة أو كود...',
    notePlaceholder: 'اكتب ملاحظاتك بأي لغة...',
  },
  hi: {
    notebooks: 'नोटबुक्स', newNotebook: 'नई नोटबुक', importBtn: 'इंपोर्ट',
    stationeryTitle: 'लक्ज़री स्टेशनरी', paperRuling: 'पेपर लाइन स्टाइल', photoOpacity: 'फ़ोटो पारदर्शिता', done: 'पूर्ण',
    craftExpand: '✍️ लिखें / विस्तार', polish: '✨ सुधारें', summarize: '📝 सारांश', brainstorm: '💡 विचार', translate: '🌍 अनुवाद',
    generate: 'Aether से बनाएँ', addCode: '+ कोड', addAether: '+ Aether AI', addText: '+ नोट', addPhoto: '+ फ़ोटो',
    aetherPromptPlaceholder: 'Aether से लेखन, योजना, गणित या कोडिंग कुछ भी करवाएँ...',
    notePlaceholder: 'किसी भी भाषा में अपने नोट्स लिखें...',
  },
};

export function getUILabels(langCode: string): UILabels {
  const base: UILabels = {
    notebooks: 'Notebooks',
    newNotebook: 'New Notebook',
    importBtn: 'Import',
    stationeryTitle: 'Luxury Stationery Studio',
    paperRuling: 'Paper Ruling',
    photoOpacity: 'Custom Stationery Opacity',
    done: 'Apply Stationery',
    craftExpand: '✍️ Craft & Expand',
    polish: '✨ Polish',
    summarize: '📝 Summarize',
    brainstorm: '💡 Brainstorm',
    translate: '🌍 Translate',
    generate: 'Craft with Aether',
    addCode: '+ Code',
    addAether: '+ Aether AI',
    addText: '+ Note',
    addPhoto: '+ Photo',
    aetherPromptPlaceholder: 'Ask Aether to craft any story, letter, plan, summary, formula, or code...',
    notePlaceholder: 'Write or dictate notes in any language...',
  };
  return { ...base, ...(UI_TRANSLATIONS[langCode] || {}) };
}

export interface StationeryDescriptor {
  id: StationeryTheme;
  name: string;
  category: 'Dark Luxe' | 'Fine Paper & Marble' | 'Artisan & Atmospheric';
  icon: string;
  isLight: boolean;
  swatchStyle: string;
}

export const LUXURY_STATIONERY_CATALOG: StationeryDescriptor[] = [
  { id: 'viper-obsidian', name: 'Viper Obsidian & Ember', category: 'Dark Luxe', icon: '🔥', isLight: false, swatchStyle: 'linear-gradient(135deg, #0b0d14 0%, #1d1412 60%, #ea580c 140%)' },
  { id: 'obsidian-gold', name: '24K Obsidian Gold', category: 'Dark Luxe', icon: '👑', isLight: false, swatchStyle: 'linear-gradient(135deg, #09090b 0%, #241e0e 65%, #ca8a04 135%)' },
  { id: 'cosmic-nebula', name: 'Deep-Space Nebula', category: 'Dark Luxe', icon: '🌌', isLight: false, swatchStyle: 'linear-gradient(135deg, #070616 0%, #1e1b4b 55%, #6d28d9 125%)' },
  { id: 'aurora-borealis', name: 'Arctic Aurora Silk', category: 'Dark Luxe', icon: '🌠', isLight: false, swatchStyle: 'linear-gradient(135deg, #04131d 0%, #064e3b 60%, #06b6d4 130%)' },
  { id: 'royal-sapphire', name: 'Royal Sapphire Velvet', category: 'Dark Luxe', icon: '💠', isLight: false, swatchStyle: 'linear-gradient(135deg, #050d24 0%, #172554 60%, #3b82f6 135%)' },
  { id: 'emerald-royale', name: 'Emerald Royale', category: 'Dark Luxe', icon: '💎', isLight: false, swatchStyle: 'linear-gradient(135deg, #021c15 0%, #064e3b 65%, #10b981 135%)' },
  { id: 'cognac-leather', name: 'Cognac Saddle Leather', category: 'Dark Luxe', icon: '💼', isLight: false, swatchStyle: 'linear-gradient(135deg, #1c1008 0%, #3e2211 60%, #9a5828 130%)' },
  { id: 'amethyst-velvet', name: 'Imperial Amethyst', category: 'Dark Luxe', icon: '🔮', isLight: false, swatchStyle: 'linear-gradient(135deg, #13071e 0%, #3b0764 65%, #a855f7 135%)' },
  { id: 'dark-slate', name: 'Midnight Studio Slate', category: 'Dark Luxe', icon: '🌑', isLight: false, swatchStyle: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)' },

  { id: 'calacatta-marble', name: 'Calacatta Gold Marble', category: 'Fine Paper & Marble', icon: '🏛️', isLight: true, swatchStyle: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 55%, #d6c7a9 100%)' },
  { id: 'ivory-parchment', name: 'French Ivory Vellum', category: 'Fine Paper & Marble', icon: '📜', isLight: true, swatchStyle: 'linear-gradient(135deg, #fffdf7 0%, #f5ebd6 100%)' },
  { id: 'aged-scroll', name: 'Florentine Antique Scroll', category: 'Fine Paper & Marble', icon: '🏺', isLight: true, swatchStyle: 'linear-gradient(135deg, #f3e3c3 0%, #d4b483 100%)' },
  { id: 'japanese-linen', name: 'Kyoto Washi Bamboo', category: 'Fine Paper & Marble', icon: '🍵', isLight: true, swatchStyle: 'linear-gradient(135deg, #fbf7ef 0%, #e7decb 100%)' },
  { id: 'botanical-sage', name: 'Botanical Eucalyptus', category: 'Fine Paper & Marble', icon: '🌿', isLight: true, swatchStyle: 'linear-gradient(135deg, #f2f7f3 0%, #cfe0d3 100%)' },
  { id: 'sakura-pastel', name: 'Kyoto Sakura Petal', category: 'Fine Paper & Marble', icon: '🌸', isLight: true, swatchStyle: 'linear-gradient(135deg, #fff5f7 0%, #fbcfe8 100%)' },
  { id: 'lavender-mist', name: 'Provence Lavender Cotton', category: 'Fine Paper & Marble', icon: '🪻', isLight: true, swatchStyle: 'linear-gradient(135deg, #f8f5ff 0%, #ddd6fe 100%)' },
  { id: 'rose-quartz', name: 'Rose Quartz Pearl', category: 'Fine Paper & Marble', icon: '🌷', isLight: true, swatchStyle: 'linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)' },
  { id: 'nordic-frost', name: 'Nordic Glacial Paper', category: 'Fine Paper & Marble', icon: '❄️', isLight: true, swatchStyle: 'linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)' },

  { id: 'blueprint-cyan', name: 'Master Architect Blueprint', category: 'Artisan & Atmospheric', icon: '📐', isLight: false, swatchStyle: 'linear-gradient(135deg, #031c38 0%, #07396b 70%, #0284c7 130%)' },
  { id: 'tokyo-rain', name: 'Tokyo Neon Midnight', category: 'Artisan & Atmospheric', icon: '🌃', isLight: false, swatchStyle: 'linear-gradient(135deg, #090919 0%, #1e1b4b 55%, #be185d 130%)' },
  { id: 'cyber-synth', name: 'Synthwave Laser Grid', category: 'Artisan & Atmospheric', icon: '⚡', isLight: false, swatchStyle: 'linear-gradient(135deg, #120428 0%, #3b0764 55%, #ec4899 130%)' },
  { id: 'terracotta-clay', name: 'Tuscan Sun Terracotta', category: 'Artisan & Atmospheric', icon: '☀️', isLight: true, swatchStyle: 'linear-gradient(135deg, #fdf2eb 0%, #f3ccb3 100%)' },
  { id: 'espresso-kraft', name: 'Artisan Kraft Journal', category: 'Artisan & Atmospheric', icon: '☕', isLight: true, swatchStyle: 'linear-gradient(135deg, #e7d4b5 0%, #c6a477 100%)' },
  { id: 'custom-photo', name: 'Upload Custom Stationery', category: 'Artisan & Atmospheric', icon: '🖼️', isLight: false, swatchStyle: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)' },
];

export const PAPER_RULINGS: { id: PaperRuling; label: string; icon: string }[] = [
  { id: 'none', label: 'Blank Vellum', icon: '📄' },
  { id: 'lined', label: 'College Ruled', icon: '📝' },
  { id: 'grid', label: 'Architect Grid', icon: '⌗' },
  { id: 'dot-grid', label: 'Bullet Dots', icon: '⠿' },
  { id: 'cornell', label: 'Cornell Study', icon: '📑' },
];

export function isLightStationery(theme: StationeryTheme): boolean {
  return LUXURY_STATIONERY_CATALOG.find((t) => t.id === theme)?.isLight ?? false;
}

const AETHER_CLOUD_URLS = [
  'https://aether.viperstudiostechnologies.com/api/aether-bridge/notebook-assist',
  'https://viperstudiostechnologies.com/api/aether-bridge/notebook-assist',
];

export async function invokeAetherSovereignAssistant(params: {
  action: AIActionType;
  content: string;
  uiLanguageName: string;
  targetLanguage?: string;
  codeLanguage?: string;
}): Promise<string> {
  const cleanInput = (params.content || '').trim();
  if (!cleanInput) {
    throw new Error('Write a short prompt, topic, or note first so Aether can craft it for you!');
  }

  for (const endpoint of AETHER_CLOUD_URLS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Aether-App': 'AI-Notebook-Pro-v1.2',
        },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.result) {
          return String(data.result).trim();
        }
      }
    } catch {
      // Try secondary gateway or offline Aether craft fallback
    }
  }

  // Resilient Offline Aether Craft Fallback (when device is in Airplane Mode / zero Wi-Fi)
  return buildOfflineAetherFallback(params.action, cleanInput, params.targetLanguage || params.uiLanguageName, params.codeLanguage);
}

function buildOfflineAetherFallback(
  action: AIActionType,
  text: string,
  langName: string,
  codeLang = 'python'
): string {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (action === 'summarize') {
    const bullets = lines.slice(0, 5).map((l) => `• ${l.replace(/^[-*•]\s*/, '')}`);
    return `### 📌 Aether Key Summary (${langName})\n${bullets.join('\n')}`;
  }
  if (action === 'brainstorm') {
    return `### 💡 Aether Creative Directions: ${lines[0]?.slice(0, 60) || 'Concept'}\n1. **Core Vision**: Clarify the main goal and audience impact.\n2. **Actionable Structure**: Break execution into 3 milestone steps.\n3. **Creative Hook**: Lead with a vivid opening example or story.\n4. **Refinement**: Eliminate friction and highlight measurable value.\n5. **Next Step**: Draft the first concrete section right below.`;
  }
  if (action === 'polish') {
    return text
      .replace(/\s+/g, ' ')
      .replace(/(^\w|[.!?]\s+\w)/g, (m) => m.toUpperCase())
      .trim();
  }
  if (action === 'code' || action === 'fix') {
    if (codeLang === 'aetherprime') {
      return `namespace ViperStudios.AetherPrime.Notebook {\n  fn solveTask(x: f64) -> f64 {\n    return x * 2.0;\n  }\n}`;
    }
    return `# Crafted by Aether (${codeLang})\ndef run_task():\n    topic = ${JSON.stringify(lines[0] || 'Notebook Task')}\n    return f"Aether ready: {topic}"\n\nprint(run_task())`;
  }
  return `### ✨ Crafted by Aether\n\n${text}\n\n- **Key Takeaway**: Structured and ready to expand once online connection resumes.`;
}
