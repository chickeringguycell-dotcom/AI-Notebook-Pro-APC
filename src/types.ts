export type CellType = 'code' | 'markdown' | 'ai';
export type CellLanguage = 'python' | 'javascript';

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
  aiPrompt?: string;
  isExecuting?: boolean;
  isAiGenerating?: boolean;
  outputs: CellOutput[];
  errorExplanation?: string;
}

export type AIModelType = 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gpt-4o-mini';

export interface UserSubscription {
  tier: 'free' | 'pro';
  dailyCreditsRemaining: number;
  lastCreditReset: number;
}
