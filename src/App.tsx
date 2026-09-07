import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Plus,
  Sparkles,
  Trash2,
  Code2,
  FileText,
  Download,
  Upload,
  Printer,
  Camera,
  Mic,
  MicOff,
  Settings,
  X,
  RefreshCw,
  Wrench,
  HelpCircle,
  Zap,
  Crown,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Palette,
  BookOpen,
  FolderOpen,
  ChevronDown,
  Globe
} from 'lucide-react';
import {
  NotebookCell,
  NotebookDoc,
  StationeryTheme,
  PaperRuling,
  AIModelType,
  AIActionType,
  CellLanguage,
  UserSubscription
} from './types';
import { runner } from './runner';

const STATIONERY_THEMES: { id: StationeryTheme; name: string; icon: string; previewClass: string }[] = [
  { id: 'dark-slate', name: 'Obsidian Slate', icon: '🌌', previewClass: 'theme-dark-slate' },
  { id: 'obsidian-gold', name: 'Obsidian Gold', icon: '👑', previewClass: 'theme-obsidian-gold' },
  { id: 'ivory-parchment', name: 'French Ivory', icon: '📜', previewClass: 'theme-ivory-parchment' },
  { id: 'aged-scroll', name: 'Antique Scroll', icon: '🏺', previewClass: 'theme-aged-scroll' },
  { id: 'emerald-royale', name: 'Emerald Royale', icon: '💎', previewClass: 'theme-emerald-royale' },
  { id: 'calacatta-marble', name: 'Calacatta Marble', icon: '🏛️', previewClass: 'theme-calacatta-marble' },
  { id: 'japanese-linen', name: 'Kyoto Washi', icon: '🍵', previewClass: 'theme-japanese-linen' },
  { id: 'blueprint-cyan', name: 'Blueprint Grid', icon: '📐', previewClass: 'theme-blueprint-cyan' },
  { id: 'sakura-pastel', name: 'Sakura Blossom', icon: '🌸', previewClass: 'theme-sakura-pastel' },
  { id: 'tokyo-rain', name: 'Tokyo Midnight', icon: '🌃', previewClass: 'theme-tokyo-rain' },
  { id: 'custom-photo', name: 'Custom Photo / Wallpaper', icon: '🖼️', previewClass: 'bg-slate-900' },
];

const CODE_LANGUAGES: { id: CellLanguage; label: string }[] = [
  { id: 'python', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'sql', label: 'SQL' },
  { id: 'html', label: 'HTML / CSS' },
  { id: 'cpp', label: 'C++' },
  { id: 'rust', label: 'Rust' },
  { id: 'java', label: 'Java' },
];

const TRANSLATION_LANGUAGES = [
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Chinese (Mandarin)',
  'Korean',
  'Arabic',
  'Hindi',
  'Russian'
];

const INITIAL_NOTEBOOKS: NotebookDoc[] = [
  {
    id: 'nb-1',
    title: 'Welcome to AI Notebook',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    theme: 'dark-slate',
    ruling: 'none',
    wallpaperOpacity: 90,
    cells: [
      {
        id: 'c-1',
        type: 'markdown',
        content: '# 📱 AI Notebook Pro\nYour luxury AI writing assistant, multi-language coding environment, and photo journal.\n\n- ✍️ **Universal AI Assistant**: Draft, summarize, translate to 10+ languages, and solve complex math.\n- 💻 **Multi-Language Coding**: Python, JavaScript, TypeScript, SQL, HTML, C++, Rust, and Java.\n- 🎨 **Luxury Stationery**: French Ivory parchment, Italian Calacatta marble, Kyoto linen, and custom photo wallpapers.\n- 📸 **Camera & Photo Mode**: Attach snapshots directly into your notes.\n- 🎙️ **Voice Dictation**: Speak and transcribe thoughts hands-free.\n- 🖨️ **Print & Export**: 1-Tap Print to PDF, Markdown, and Jupyter Notebook formats.',
        outputs: [],
      },
      {
        id: 'c-2',
        type: 'code',
        language: 'python',
        content: '# Python algorithm & trajectory calculation\nimport math\n\ndef calculate_trajectory(v0, angle_deg):\n    angle_rad = math.radians(angle_deg)\n    g = 9.81\n    time_of_flight = (2 * v0 * math.sin(angle_rad)) / g\n    max_range = (v0**2 * math.sin(2 * angle_rad)) / g\n    return f"Flight Time: {round(time_of_flight, 2)}s | Range: {round(max_range, 2)}m"\n\nprint(calculate_trajectory(45, 30))',
        outputs: [],
      },
    ],
  },
];

export const App: React.FC = () => {
  const [notebooks, setNotebooks] = useState<NotebookDoc[]>(() => {
    const saved = localStorage.getItem('AI_NOTEBOOKS_DATA');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_NOTEBOOKS;
  });

  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => {
    return notebooks[0]?.id || 'nb-1';
  });

  const activeNotebook = notebooks.find((nb) => nb.id === activeNotebookId) || notebooks[0] || INITIAL_NOTEBOOKS[0];

  const [activeCellId, setActiveCellId] = useState<string>(activeNotebook.cells[0]?.id || '');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [selectedModel, setSelectedModel] = useState<AIModelType>('gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStationeryModal, setShowStationeryModal] = useState<boolean>(false);
  const [showNotebookShelf, setShowNotebookShelf] = useState<boolean>(false);
  const [showProModal, setShowProModal] = useState<boolean>(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [subscription, setSubscription] = useState<UserSubscription>(() => {
    const saved = localStorage.getItem('AI_NOTEBOOK_SUB');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      tier: 'free',
      dailyCreditsRemaining: 25,
      lastCreditReset: Date.now(),
    };
  });

  useEffect(() => {
    localStorage.setItem('AI_NOTEBOOKS_DATA', JSON.stringify(notebooks));
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('AI_NOTEBOOK_SUB', JSON.stringify(subscription));
  }, [subscription]);

  useEffect(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - subscription.lastCreditReset > oneDay && subscription.tier === 'free') {
      setSubscription({
        tier: 'free',
        dailyCreditsRemaining: 25,
        lastCreditReset: Date.now(),
      });
    }
  }, []);

  const deductCredit = (): boolean => {
    if (subscription.tier === 'pro') return true;
    if (subscription.dailyCreditsRemaining <= 0) {
      setShowProModal(true);
      return false;
    }
    setSubscription((prev) => ({
      ...prev,
      dailyCreditsRemaining: prev.dailyCreditsRemaining - 1,
    }));
    return true;
  };

  const updateActiveNotebook = (updater: (prev: NotebookDoc) => NotebookDoc) => {
    setNotebooks((prev) =>
      prev.map((nb) => (nb.id === activeNotebookId ? { ...updater(nb), updatedAt: Date.now() } : nb))
    );
  };

  const createNewNotebook = () => {
    const newNb: NotebookDoc = {
      id: `nb-${Date.now()}`,
      title: `Notebook ${notebooks.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      theme: activeNotebook.theme || 'dark-slate',
      ruling: activeNotebook.ruling || 'none',
      wallpaperOpacity: 90,
      cells: [
        {
          id: `c-${Date.now()}`,
          type: 'markdown',
          content: '## New Note\nStart writing, brainstorm ideas, code in Python/JS, or snap a photo...',
          outputs: [],
        },
      ],
    };
    setNotebooks((prev) => [newNb, ...prev]);
    setActiveNotebookId(newNb.id);
    setActiveCellId(newNb.cells[0].id);
    setShowNotebookShelf(false);
  };

  const deleteNotebook = (id: string) => {
    if (notebooks.length <= 1) {
      alert('You must keep at least one notebook.');
      return;
    }
    const remaining = notebooks.filter((nb) => nb.id !== id);
    setNotebooks(remaining);
    if (activeNotebookId === id) {
      setActiveNotebookId(remaining[0].id);
    }
  };

  const addCell = (type: 'code' | 'markdown' | 'ai' | 'photo') => {
    const newCell: NotebookCell = {
      id: `c-${Date.now()}`,
      type,
      language: 'python',
      content: type === 'markdown' ? '## Notes\n' : '',
      aiPrompt: '',
      outputs: [],
    };
    updateActiveNotebook((nb) => ({
      ...nb,
      cells: [...nb.cells, newCell],
    }));
    setActiveCellId(newCell.id);
  };

  const deleteCell = (id: string) => {
    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.filter((c) => c.id !== id),
    }));
  };

  const updateCellContent = (id: string, content: string) => {
    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.map((c) => (c.id === id ? { ...c, content } : c)),
    }));
  };

  const updateCellLanguage = (id: string, language: CellLanguage) => {
    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.map((c) => (c.id === id ? { ...c, language } : c)),
    }));
  };

  const runCell = async (cell: NotebookCell) => {
    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isExecuting: true, errorExplanation: undefined } : c)),
    }));

    const outputs = await runner.execute(cell);

    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isExecuting: false, outputs } : c)),
    }));
  };

  const toggleSpeechRecognition = (cellId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported on this browser/device.');
      return;
    }

    if (isRecording === cellId) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          updateActiveNotebook((nb) => ({
            ...nb,
            cells: nb.cells.map((c) =>
              c.id === cellId ? { ...c, content: `${c.content ? c.content + ' ' : ''}${transcript}` } : c
            ),
          }));
        }
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setIsRecording(null);
      };

      recognition.onend = () => {
        setIsRecording(null);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(cellId);
    } catch (e: any) {
      alert(`Microphone Error: ${e.message}`);
      setIsRecording(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, targetCellId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (targetCellId) {
        updateActiveNotebook((nb) => ({
          ...nb,
          cells: nb.cells.map((c) => (c.id === targetCellId ? { ...c, photoUrl: base64 } : c)),
        }));
      } else {
        const newCell: NotebookCell = {
          id: `c-${Date.now()}`,
          type: 'photo',
          content: '',
          photoUrl: base64,
          photoCaption: file.name.replace(/\.[^/.]+$/, ''),
          outputs: [],
        };
        updateActiveNotebook((nb) => ({
          ...nb,
          cells: [...nb.cells, newCell],
        }));
        setActiveCellId(newCell.id);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateActiveNotebook((nb) => ({
        ...nb,
        theme: 'custom-photo',
        customWallpaper: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const callGeminiLLM = async (systemInstruction: string, promptText: string): Promise<string> => {
    if (!apiKey) {
      throw new Error('Please enter your Google Gemini API Key in Settings (or click "Get Free Gemini Key").');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\nContext:\n${promptText}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `API Error: ${res.status}`);
    }

    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
  };

  const handleAIAction = async (cell: NotebookCell, action: AIActionType, extraParam?: string) => {
    if (!deductCredit()) return;

    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: true } : c)),
    }));

    try {
      let systemPrompt = '';
      let userPrompt = cell.content || cell.aiPrompt || '';

      if (action === 'draft') systemPrompt = `You are a creative writer. Expand and structure the following note.`;
      else if (action === 'polish') systemPrompt = `Expertly edit this text for clarity, elegance, and grammar.`;
      else if (action === 'summarize') systemPrompt = `Summarize this text with high-impact takeaways.`;
      else if (action === 'brainstorm') systemPrompt = `Generate 5 creative angles and next steps for this content.`;
      else if (action === 'translate') systemPrompt = `Translate this text accurately into ${extraParam}. Preserve formatting.`;
      else if (action === 'code') systemPrompt = `As a Senior ${cell.language?.toUpperCase()} Engineer, write clean, executable code for: ${userPrompt}. Return raw code only.`;
      else if (action === 'fix') {
        systemPrompt = `Fix the broken ${cell.language || 'python'} code based on the traceback error below. Return raw code only.`;
        userPrompt = `Broken Code:\n${cell.content}\n\nError Traceback:\n${cell.outputs.find((o) => o.type === 'error')?.content}`;
      }

      const result = await callGeminiLLM(systemPrompt, userPrompt);

      updateActiveNotebook((nb) => ({
        ...nb,
        cells: nb.cells.map((c) =>
          c.id === cell.id
            ? {
                ...c,
                type: action === 'code' || action === 'fix' ? 'code' : c.type,
                content: action === 'translate' ? `${c.content}\n\n> 🌍 **Translation (${extraParam})**:\n${result}` : result,
                isAiGenerating: false,
              }
            : c
        ),
      }));
    } catch (err: any) {
      alert(`AI Error: ${err.message}`);
      updateActiveNotebook((nb) => ({
        ...nb,
        cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: false } : c)),
      }));
    }
  };

  const handlePrint = () => window.print();

  const exportIpynb = () => {
    const ipynb = {
      cells: activeNotebook.cells.map((cell) => ({
        cell_type: cell.type === 'code' ? 'code' : 'markdown',
        source: cell.content.split('\n').map((l) => l + '\n'),
      })),
      nbformat: 4,
      nbformat_minor: 2,
    };
    const blob = new Blob([JSON.stringify(ipynb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNotebook.title.toLowerCase().replace(/\s+/g, '_')}.ipynb`;
    a.click();
  };

  const exportMarkdown = () => {
    let md = `# ${activeNotebook.title}\n\n`;
    activeNotebook.cells.forEach((c) => {
      if (c.type === 'photo') md += `![${c.photoCaption || 'Photo'}](${c.photoUrl || ''})\n\n${c.content}\n\n---\n\n`;
      else if (c.type === 'code') md += `\`\`\`${c.language || 'python'}\n${c.content}\n\`\`\`\n\n`;
      else md += `${c.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNotebook.title.toLowerCase().replace(/\s+/g, '_')}.md`;
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          setNotebooks((prev) => [parsed, ...prev]);
          setActiveNotebookId(parsed.id);
        } else {
          const newDoc: NotebookDoc = {
            id: `nb-${Date.now()}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            theme: 'dark-slate',
            ruling: 'none',
            wallpaperOpacity: 90,
            cells: [{ id: `c-${Date.now()}`, type: 'markdown', content: text, outputs: [] }],
          };
          setNotebooks((prev) => [newDoc, ...prev]);
          setActiveNotebookId(newDoc.id);
        }
      } catch (err: any) {
        alert(`Failed to import: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const getRulingClass = (ruling: PaperRuling) => {
    switch (ruling) {
      case 'lined': return 'ruling-lined';
      case 'grid': return 'ruling-grid';
      case 'dot-grid': return 'ruling-dot-grid';
      default: return '';
    }
  };

  return (
    <div className={`flex flex-col h-full w-full select-none relative overflow-hidden ${activeNotebook.theme !== 'custom-photo' ? `theme-${activeNotebook.theme}` : 'bg-[#080c16]'}`}>
      {activeNotebook.theme === 'custom-photo' && activeNotebook.customWallpaper && (
        <div className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 transition-opacity" style={{ backgroundImage: `url(${activeNotebook.customWallpaper})`, opacity: (activeNotebook.wallpaperOpacity ?? 90) / 100 }} />
      )}

      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e)} />
      <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e)} />
      <input type="file" ref={wallpaperInputRef} accept="image/*" className="hidden" onChange={handleCustomWallpaperUpload} />
      <input type="file" ref={importInputRef} accept=".json,.md,.txt,.ipynb" className="hidden" onChange={handleImportFile} />

      <header className="pt-10 pb-3 px-4 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between shadow-lg relative z-10 no-print">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotebookShelf(true)} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-xs font-semibold text-white active:scale-95 transition">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[120px] truncate">{activeNotebook.title}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {subscription.tier === 'pro' ? (
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded shadow"><Crown className="w-2.5 h-2.5" /> PRO</span>
          ) : (
            <button onClick={() => setShowProModal(true)} className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded hover:bg-amber-500/20 transition">⚡ {subscription.dailyCreditsRemaining} Credits</button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowStationeryModal(true)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition"><Palette className="w-4 h-4 text-purple-300" /></button>
          <button onClick={handlePrint} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition"><Printer className="w-4 h-4 text-emerald-300" /></button>
          <button onClick={exportMarkdown} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition"><Download className="w-4 h-4 text-cyan-300" /></button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition"><Settings className="w-4 h-4 text-slate-300" /></button>
        </div>
      </header>

      {showNotebookShelf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10172b] border border-cyan-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-cyan-400" /><h3 className="font-bold text-sm text-white">Notebooks</h3></div>
              <button onClick={() => setShowNotebookShelf(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {notebooks.map((nb) => (
                <div key={nb.id} onClick={() => { setActiveNotebookId(nb.id); setShowNotebookShelf(false); }} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${activeNotebookId === nb.id ? 'border-cyan-500 bg-cyan-950/40' : 'border-slate-800 bg-slate-900/60'}`}>
                  <div className="flex-1 min-w-0 pr-2"><input type="text" value={nb.title} onClick={(e) => e.stopPropagation()} onChange={(e) => setNotebooks((prev) => prev.map((n) => (n.id === nb.id ? { ...n, title: e.target.value } : n)))} className="bg-transparent text-xs font-bold text-white w-full focus:outline-none" /></div>
                  <button onClick={() => deleteNotebook(nb.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-700 flex gap-2">
              <button onClick={createNewNotebook} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"><Plus className="w-4 h-4" /> New Notebook</button>
              <button onClick={() => importInputRef.current?.click()} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition"><Upload className="w-3.5 h-3.5" /> Import</button>
            </div>
          </div>
        </div>
      )}

      {showStationeryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10172b] border border-purple-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2"><Palette className="w-5 h-5 text-purple-400" /><h3 className="font-bold text-sm text-white">Luxury Stationery</h3></div>
              <button onClick={() => setShowStationeryModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {STATIONERY_THEMES.map((theme) => (
                  <button key={theme.id} onClick={() => theme.id === 'custom-photo' ? wallpaperInputRef.current?.click() : updateActiveNotebook((nb) => ({ ...nb, theme: theme.id }))} className={`p-2 rounded-xl border flex items-center gap-2 transition ${activeNotebook.theme === theme.id ? 'border-purple-500 bg-purple-950/50' : 'border-slate-800 bg-slate-900/60'}`}>
                    <span className="text-base">{theme.icon}</span>
                    <span className="text-xs font-medium text-slate-200 truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowStationeryModal(false)} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition">Done</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="bg-[#10172b]/95 border-b border-cyan-500/30 p-4 space-y-3 relative z-20 backdrop-blur-md no-print">
          <div className="flex justify-between items-center text-xs font-semibold text-cyan-300"><span>AI Settings</span><button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-slate-400" /></button></div>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as AIModelType)} className="w-full text-xs bg-[#080c16] border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-cyan-200 focus:outline-none">
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>
          <input type="password" placeholder="Paste Google AI Studio API Key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full text-xs bg-[#080c16] border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-cyan-200 focus:outline-none" />
          <div className="flex gap-2 pt-1">
            <button onClick={exportIpynb} className="flex-1 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-200 font-semibold flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5 text-cyan-400" /> Export .ipynb</button>
            <button onClick={exportMarkdown} className="flex-1 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-200 font-semibold flex items-center justify-center gap-1"><FileText className="w-3.5 h-3.5 text-purple-400" /> Export .md</button>
          </div>
        </div>
      )}

      {showProModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10172b] border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setShowProModal(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 mb-3"><Crown className="w-6 h-6 text-amber-400" /><h2 className="text-lg font-bold text-white">Upgrade to Pro</h2></div>
            <p className="text-xs text-slate-300 mb-4">Unlock unlimited AI writing generations, multi-language coding, auto-debugging, and custom stationery wallpapers.</p>
            <div className="space-y-2 mb-6 text-xs text-slate-200">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Unlimited AI Generations</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Multi-Language Code Solver</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Universal Polyglot AI Translator</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> All Luxury Stationery Themes</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> One-Tap Auto-Heal on Errors</div>
            </div>
            <button onClick={() => { setSubscription({ ...subscription, tier: 'pro' }); setShowProModal(false); alert('Pro Plan Activated!'); }} className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-sm rounded-xl transition">Get Pro Access ($4.99/mo)</button>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
        </div>
      )}

      <main className={`flex-1 overflow-y-auto p-3 space-y-3 pb-28 relative z-10 ${getRulingClass(activeNotebook.ruling)}`}>
        {activeNotebook.cells.map((cell, idx) => {
          const hasError = cell.outputs.some((o) => o.type === 'error');
          const isMicActive = isRecording === cell.id;

          return (
            <div key={cell.id} onClick={() => setActiveCellId(cell.id)} className={`note-cell-container rounded-2xl border transition-all duration-150 backdrop-blur-sm ${activeCellId === cell.id ? 'border-cyan-400/80 bg-slate-900/85' : 'border-white/10 bg-slate-900/60'}`}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-[11px] text-slate-300 bg-black/30 rounded-t-2xl no-print">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-mono">[{idx + 1}]</span>
                  {cell.type === 'code' ? (
                    <select value={cell.language || 'python'} onClick={(e) => e.stopPropagation()} onChange={(e) => updateCellLanguage(cell.id, e.target.value as CellLanguage)} className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 uppercase border border-cyan-500/30 focus:outline-none">
                      {CODE_LANGUAGES.map((l) => <option key={l.id} value={l.id} className="bg-slate-900 text-white">{l.label}</option>)}
                    </select>
                  ) : (
                    <span className="uppercase text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">{cell.type}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); toggleSpeechRecognition(cell.id); }} className={`p-1.5 rounded-lg border ${isMicActive ? 'bg-rose-600' : 'bg-white/10'}`}><Mic className="w-3 h-3" /></button>
                  {cell.type === 'code' && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleAIAction(cell, 'draft'); }} className="p-1.5 rounded-lg bg-white/10 border"><HelpCircle className="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleAIAction(cell, 'code'); }} className="p-1.5 rounded-lg bg-white/10 border"><Zap className="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); runCell(cell); }} className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600/40 rounded-lg"><Play className="w-3 h-3" /> Run</button>
                    </>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); deleteCell(cell.id); }} className="text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {cell.type === 'ai' && (
                <div className="p-2 border-b border-purple-500/20 bg-purple-950/30 flex gap-2 no-print">
                  <input type="text" placeholder="Describe writing draft, math equation, or algorithm in any language..." value={cell.aiPrompt || ''} onChange={(e) => updateActiveNotebook((nb) => ({ ...nb, cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, aiPrompt: e.target.value } : c)) }))} onKeyDown={(e) => e.key === 'Enter' && handleAIAction(cell, 'draft')} className="flex-1 bg-[#18112b] border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-xs text-purple-100" />
                  <button onClick={() => handleAIAction(cell, 'draft')} className="px-3 py-1.5 bg-purple-600 rounded-lg text-xs font-semibold text-white">Generate</button>
                </div>
              )}

              {cell.type === 'photo' && (
                <div className="p-3">
                  {cell.photoUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-white/15 max-h-64 cursor-pointer" onClick={() => setPreviewImage(cell.photoUrl || null)}><img src={cell.photoUrl} className="w-full object-cover max-h-64 rounded-xl" /></div>
                      <input type="text" placeholder="Add photo caption..." value={cell.photoCaption || ''} onChange={(e) => updateActiveNotebook((nb) => ({ ...nb, cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, photoCaption: e.target.value } : c)) }))} className="w-full bg-transparent text-xs text-slate-300 italic border-b border-white/10 pb-1" />
                    </div>
                  ) : (
                    <div className="flex gap-2 py-4 justify-center"><button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/30 rounded-xl text-xs font-semibold"><Camera className="w-4 h-4" /> Take Photo</button></div>
                  )}
                </div>
              )}

              {cell.type !== 'photo' && (
                <div className="p-3">
                  <textarea value={cell.content} onChange={(e) => updateCellContent(cell.id, e.target.value)} rows={Math.max(2, cell.content.split('\n').length)} placeholder={cell.type === 'markdown' ? 'Type notes in any language...' : 'Write code...'} className="w-full bg-transparent font-mono text-xs text-inherit placeholder-slate-500 resize-none focus:outline-none leading-relaxed" spellCheck={false} />
                </div>
              )}

              {cell.type === 'markdown' && (
                <div className="px-3 py-1.5 bg-black/20 border-t border-white/5 flex items-center gap-1 overflow-x-auto no-print relative">
                  <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5 text-purple-400" /> AI:</span>
                  <button onClick={() => handleAIAction(cell, 'draft')} className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-purple-200">✍️ Expand</button>
                  <button onClick={() => handleAIAction(cell, 'polish')} className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-cyan-200">✨ Polish</button>
                  <button onClick={() => handleAIAction(cell, 'summarize')} className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-emerald-200">📝 Summarize</button>
                  <button onClick={() => handleAIAction(cell, 'brainstorm')} className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-amber-200">💡 Brainstorm</button>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowTranslateMenu(showTranslateMenu === cell.id ? null : cell.id); }} className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-indigo-200 flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" /> Translate ▾</button>
                    {showTranslateMenu === cell.id && (
                      <div className="absolute left-0 bottom-full mb-1 w-36 bg-[#10172b] border border-indigo-500/40 rounded-xl shadow-2xl p-1 z-30 max-h-48 overflow-y-auto">
                        {TRANSLATION_LANGUAGES.map((lang) => <button key={lang} onClick={() => { setShowTranslateMenu(null); handleAIAction(cell, 'translate', lang); }} className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-200">{lang}</button>)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasError && (
                <div className="px-3 py-2 bg-rose-950/40 border-t border-rose-500/30 flex items-center justify-between no-print">
                  <div className="flex items-center gap-1.5 text-xs text-rose-300"><AlertCircle className="w-3.5 h-3.5" /><span>Runtime error</span></div>
                  <button onClick={() => handleAIAction(cell, 'fix')} className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white rounded-lg"><Wrench className="w-3 h-3" /> ✨ Fix with AI</button>
                </div>
              )}

              {cell.outputs && cell.outputs.length > 0 && (
                <div className="p-3 bg-black/60 border-t border-white/10 font-mono text-[11px] rounded-b-2xl overflow-y-auto">
                  {cell.outputs.map((out) => <div key={out.id} className={out.type === 'error' ? 'text-rose-400' : 'text-emerald-300'}>{out.content}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-20 shadow-2xl no-print">
        <button onClick={() => addCell('code')} className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600/30 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-200"><Code2 className="w-3.5 h-3.5" /> + Code</button>
        <button onClick={() => addCell('ai')} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/30 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-200"><Sparkles className="w-3.5 h-3.5" /> + AI Cell</button>
        <button onClick={() => addCell('markdown')} className="flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/15 rounded-xl text-xs font-bold text-slate-200"><FileText className="w-3.5 h-3.5" /> + Text</button>
        <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-200"><Camera className="w-3.5 h-3.5" /> + Photo</button>
      </footer>
    </div>
  );
};

export default App;
