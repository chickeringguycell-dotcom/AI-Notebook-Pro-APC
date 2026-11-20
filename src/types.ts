export type CellType = 'code' | 'markdown' | 'ai' | 'photo';
export type CellLanguage =
  | 'aetherprime'
  | 'air'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'sql'
  | 'html'
  | 'cpp'
  | 'rust'
  | 'java';

export interface CellOutput {
  id: string;
  type: 'text' | 'error';
  content: string;
  timestamp: number;
}

export interface NotebookCell {
  id: string;
  type: CellType;
  language?: CellLanguage;
  content: string;
  photoUrl?: string;
  photoCaption?: string;
  aiPrompt?: string;
  isExecuting?: boolean;
  isAiGenerating?: boolean;
  outputs: CellOutput[];
  errorExplanation?: string;
}

export type StationeryTheme =
  | 'viper-obsidian'
  | 'obsidian-gold'
  | 'cosmic-nebula'
  | 'aurora-borealis'
  | 'calacatta-marble'
  | 'ivory-parchment'
  | 'aged-scroll'
  | 'japanese-linen'
  | 'cognac-leather'
  | 'emerald-royale'
  | 'royal-sapphire'
  | 'blueprint-cyan'
  | 'sakura-pastel'
  | 'botanical-sage'
  | 'lavender-mist'
  | 'rose-quartz'
  | 'tokyo-rain'
  | 'cyber-synth'
  | 'nordic-frost'
  | 'terracotta-clay'
  | 'espresso-kraft'
  | 'amethyst-velvet'
  | 'dark-slate'
  | 'custom-photo';

export type PaperRuling = 'none' | 'lined' | 'grid' | 'dot-grid' | 'cornell';

export interface NotebookDoc {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  cells: NotebookCell[];
  theme: StationeryTheme;
  ruling: PaperRuling;
  customWallpaper?: string;
  wallpaperOpacity?: number; // 20 to 100
}

export type AIModelType = 'aether-sovereign' | 'gemini-1.5-flash' | 'gemini-1.5-pro';

export type AIActionType = 'draft' | 'polish' | 'summarize' | 'brainstorm' | 'code' | 'fix' | 'translate';

export interface UserSubscription {
  tier: 'free' | 'pro';
  dailyCreditsRemaining: number;
  lastCreditReset: number;
}
