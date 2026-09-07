export type CellType = 'code' | 'markdown' | 'ai' | 'photo';
export type CellLanguage = 'python' | 'javascript' | 'typescript' | 'sql' | 'html' | 'cpp' | 'rust' | 'java';

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
  | 'dark-slate'
  | 'obsidian-gold'
  | 'ivory-parchment'
  | 'aged-scroll'
  | 'emerald-royale'
  | 'calacatta-marble'
  | 'japanese-linen'
  | 'blueprint-cyan'
  | 'sakura-pastel'
  | 'tokyo-rain'
  | 'custom-photo';

export type PaperRuling = 'none' | 'lined' | 'grid' | 'dot-grid';

export interface NotebookDoc {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  cells: NotebookCell[];
  theme: StationeryTheme;
  ruling: PaperRuling;
  customWallpaper?: string;
  wallpaperOpacity?: number; // 0 to 100
}

export type AIModelType = 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gpt-4o-mini';

export type AIActionType = 'draft' | 'polish' | 'summarize' | 'brainstorm' | 'code' | 'fix' | 'translate';

export interface UserSubscription {
  tier: 'free' | 'pro';
  dailyCreditsRemaining: number;
  lastCreditReset: number;
}


