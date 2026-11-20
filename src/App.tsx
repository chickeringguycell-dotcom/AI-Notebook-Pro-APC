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
  Settings,
  X,
  Wrench,
  HelpCircle,
  Zap,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Palette,
  BookOpen,
  FolderOpen,
  ChevronDown,
  Globe,
  Share2,
  RefreshCw,
} from 'lucide-react';
import {
  NotebookCell,
  NotebookDoc,
  StationeryTheme,
  PaperRuling,
  AIModelType,
  AIActionType,
  CellLanguage,
} from './types';
import { runner } from './runner';
import {
  WORLD_LANGUAGES,
  WorldLanguageSpec,
  detectInitialWorldLanguage,
  getUILabels,
  LUXURY_STATIONERY_CATALOG,
  PAPER_RULINGS,
  isLightStationery,
  invokeAetherSovereignAssistant,
} from './AetherNotebookSovereignEngine';

const CODE_LANGUAGES: { id: CellLanguage; label: string }[] = [
  { id: 'python', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'aetherprime', label: 'AetherPrime (.ae)' },
  { id: 'air', label: 'AIR IR (.air)' },
  { id: 'sql', label: 'SQL' },
  { id: 'html', label: 'HTML / CSS' },
  { id: 'cpp', label: 'C++' },
  { id: 'rust', label: 'Rust' },
  { id: 'java', label: 'Java' },
];

const INITIAL_NOTEBOOKS: NotebookDoc[] = [
  {
    id: 'nb-1',
    title: 'Welcome to AI Notebook Pro',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    theme: 'viper-obsidian',
    ruling: 'none',
    wallpaperOpacity: 88,
    cells: [
      {
        id: 'c-1',
        type: 'markdown',
        content:
          '# ✨ AI Notebook Pro — Powered by Aether\nYour luxury AI writing studio, polyglot translator (44 world languages), code runner, and visual snapshot journal.\n\n- 🧠 **Aether Built-In (Zero Setup)**: Craft stories, letters, business plans, summaries, and code instantly—no API key required.\n- 🌍 **44 World Languages**: Tap **🌐** above to switch interface, voice dictation, and instant translations.\n- 🎨 **24 Luxury Stationery Surfaces**: Calacatta Gold Marble, French Ivory Vellum, Obsidian Gold, Deep-Space Nebula, Kyoto Washi & custom photo stationery.\n- 📸 **Live Camera & Snapshot Cards**: Capture live camera photos or export styled visual note snapshots.',
        outputs: [],
      },
      {
        id: 'c-2',
        type: 'code',
        language: 'python',
        content:
          '# Tap "Run" to execute right on your device\nimport math\n\ndef calculate_trajectory(v0, angle_deg):\n    angle_rad = math.radians(angle_deg)\n    g = 9.81\n    flight_time = (2 * v0 * math.sin(angle_rad)) / g\n    max_range = (v0 ** 2 * math.sin(2 * angle_rad)) / g\n    return f"Flight Time: {round(flight_time, 2)}s | Range: {round(max_range, 2)}m"\n\nprint(calculate_trajectory(45, 30))',
        outputs: [],
      },
    ],
  },
];

async function compressImageFileToDataUrl(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ''));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const App: React.FC = () => {
  const [notebooks, setNotebooks] = useState<NotebookDoc[]>(() => {
    try {
      const saved = localStorage.getItem('AI_NOTEBOOKS_DATA');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_NOTEBOOKS;
  });

  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => notebooks[0]?.id || 'nb-1');
  const activeNotebook = notebooks.find((nb) => nb.id === activeNotebookId) || notebooks[0] || INITIAL_NOTEBOOKS[0];
  const isLightPaper = isLightStationery(activeNotebook.theme);

  const [currentLang, setCurrentLang] = useState<WorldLanguageSpec>(() => detectInitialWorldLanguage());
  const ui = getUILabels(currentLang.code);

  const [activeCellId, setActiveCellId] = useState<string>(activeNotebook.cells[0]?.id || '');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [selectedModel, setSelectedModel] = useState<AIModelType>('aether-sovereign');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStationeryModal, setShowStationeryModal] = useState<boolean>(false);
  const [showNotebookShelf, setShowNotebookShelf] = useState<boolean>(false);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [langSearch, setLangSearch] = useState<string>('');
  const [showTranslateMenu, setShowTranslateMenu] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live Camera Modal State
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraTargetCellId, setCameraTargetCellId] = useState<string | undefined>(undefined);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraStreamActive, setCameraStreamActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  useEffect(() => {
    try {
      localStorage.setItem('AI_NOTEBOOKS_DATA', JSON.stringify(notebooks));
    } catch {
      notify('Storage nearly full — older large images trimmed.');
    }
  }, [notebooks]);

  useEffect(() => {
    try {
      localStorage.setItem('GEMINI_API_KEY', apiKey);
    } catch {}
  }, [apiKey]);

  useEffect(() => {
    document.documentElement.lang = currentLang.code;
    document.documentElement.dir = currentLang.rtl ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('AETHER_NOTEBOOK_LANG', currentLang.code);
    } catch {}
  }, [currentLang]);

  const stopLiveCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraStreamActive(false);
  };

  const openCameraStudio = async (targetCellId?: string, facing: 'environment' | 'user' = cameraFacing) => {
    setCameraTargetCellId(targetCellId);
    setShowCameraModal(true);
    stopLiveCameraStream();

    try {
      (window as any).AndroidNotebookBridge?.requestMediaPermissions?.(true, false);
    } catch {}

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        setCameraStreamActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 60);
      } catch {
        setCameraStreamActive(false);
      }
    }
  };

  const flipLiveCamera = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    openCameraStudio(cameraTargetCellId, next);
  };

  const captureLiveVideoSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      cameraInputRef.current?.click();
      return;
    }
    const canvas = document.createElement('canvas');
    const maxDim = 1280;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      const r = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    insertCapturedPhoto(dataUrl, `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    stopLiveCameraStream();
    setShowCameraModal(false);
    notify('📸 Snapshot added to notebook!');
  };

  const insertCapturedPhoto = (base64: string, caption: string) => {
    if (cameraTargetCellId) {
      updateActiveNotebook((nb) => ({
        ...nb,
        cells: nb.cells.map((c) =>
          c.id === cameraTargetCellId ? { ...c, photoUrl: base64, photoCaption: c.photoCaption || caption } : c
        ),
      }));
    } else {
      const newCell: NotebookCell = {
        id: `c-${Date.now()}`,
        type: 'photo',
        content: '',
        photoUrl: base64,
        photoCaption: caption,
        outputs: [],
      };
      updateActiveNotebook((nb) => ({
        ...nb,
        cells: [...nb.cells, newCell],
      }));
      setActiveCellId(newCell.id);
    }
  };

  const updateActiveNotebook = (updater: (prev: NotebookDoc) => NotebookDoc) => {
    setNotebooks((prev) =>
      prev.map((nb) => (nb.id === activeNotebookId ? { ...updater(nb), updatedAt: Date.now() } : nb))
    );
  };

  const createNewNotebook = () => {
    const newNb: NotebookDoc = {
      id: `nb-${Date.now()}`,
      title: `${ui.notebooks} ${notebooks.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      theme: activeNotebook.theme || 'viper-obsidian',
      ruling: activeNotebook.ruling || 'none',
      wallpaperOpacity: 88,
      cells: [
        {
          id: `c-${Date.now()}`,
          type: 'markdown',
          content: '## ✨ New Note\n',
          outputs: [],
        },
      ],
    };
    setNotebooks((prev) => [newNb, ...prev]);
    setActiveNotebookId(newNb.id);
    setActiveCellId(newNb.cells[0].id);
    setShowNotebookShelf(false);
  };

  const deleteNotebook = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (notebooks.length <= 1) {
      notify('Keep at least one notebook.');
      return;
    }
    const remaining = notebooks.filter((nb) => nb.id !== id);
    setNotebooks(remaining);
    if (activeNotebookId === id) {
      setActiveNotebookId(remaining[0].id);
    }
  };

  const addCell = (type: 'code' | 'markdown' | 'ai' | 'photo') => {
    if (type === 'photo') {
      openCameraStudio(undefined);
      return;
    }
    const newCell: NotebookCell = {
      id: `c-${Date.now()}`,
      type,
      language: 'python',
      content: type === 'markdown' ? '' : '',
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
    updateActiveNotebook((nb) => {
      const filtered = nb.cells.filter((c) => c.id !== id);
      return {
        ...nb,
        cells:
          filtered.length > 0
            ? filtered
            : [{ id: `c-${Date.now()}`, type: 'markdown', content: '', outputs: [] }],
      };
    });
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
      cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isExecuting: true } : c)),
    }));

    const outputs = await runner.execute(cell);

    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isExecuting: false, outputs } : c)),
    }));
  };

  const toggleSpeechRecognition = (cellId: string) => {
    try {
      (window as any).AndroidNotebookBridge?.requestMediaPermissions?.(false, true);
    } catch {}

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify('Voice dictation unavailable on this device.');
      return;
    }

    if (isRecording === cellId) {
      recognitionRef.current?.stop?.();
      setIsRecording(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLang.bcp47;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          updateActiveNotebook((nb) => ({
            ...nb,
            cells: nb.cells.map((c) =>
              c.id === cellId
                ? { ...c, content: `${c.content ? c.content.trimEnd() + ' ' : ''}${finalTranscript.trim()}` }
                : c
            ),
          }));
        }
      };

      recognition.onerror = () => setIsRecording(null);
      recognition.onend = () => setIsRecording(null);

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(cellId);
      notify(`🎙️ Listening (${currentLang.nativeLabel})...`);
    } catch (e: any) {
      notify(`Mic error: ${e.message}`);
      setIsRecording(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 1280, 0.82);
      insertCapturedPhoto(compressed, file.name.replace(/\.[^/.]+$/, ''));
      stopLiveCameraStream();
      setShowCameraModal(false);
      notify('🖼️ Photo added to notebook!');
    } catch (err: any) {
      notify(err.message || 'Could not load image');
    }
  };

  const handleCustomWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 1440, 0.82);
      updateActiveNotebook((nb) => ({
        ...nb,
        theme: 'custom-photo',
        customWallpaper: compressed,
      }));
      notify('🎨 Custom stationery applied!');
    } catch {
      notify('Could not load custom stationery image');
    }
  };

  const invokeModel = async (action: AIActionType, content: string, extraParam?: string, codeLanguage?: string): Promise<string> => {
    // Optional user-supplied Gemini key override only if user explicitly selected Gemini AND entered a key
    if (selectedModel !== 'aether-sovereign' && apiKey.trim()) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Task: ${action} (${extraParam || currentLang.englishName})\n\n${content}` }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const txt = (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
          .replace(/^```[a-z]*\n/i, '')
          .replace(/\n```$/, '')
          .trim();
        if (txt) return txt;
      }
    }

    // Primary Built-In Engine: 24/7 Viper Studios Aether Sovereign AI
    return invokeAetherSovereignAssistant({
      action,
      content,
      uiLanguageName: currentLang.englishName,
      targetLanguage: extraParam || currentLang.englishName,
      codeLanguage: codeLanguage || 'python',
    });
  };

  const handleAIAction = async (cell: NotebookCell, action: AIActionType, extraParam?: string) => {
    const promptInput =
      cell.type === 'ai' && cell.aiPrompt?.trim()
        ? cell.content?.trim()
          ? `Instruction: ${cell.aiPrompt.trim()}\n\nCurrent Draft:\n${cell.content.trim()}`
          : cell.aiPrompt.trim()
        : cell.content?.trim() || cell.aiPrompt?.trim() || (cell.photoCaption ? `Expand notes about photo: ${cell.photoCaption}` : '');

    if (!promptInput) {
      notify('Type an idea, topic, or note first so Aether can craft it!');
      return;
    }

    updateActiveNotebook((nb) => ({
      ...nb,
      cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: true } : c)),
    }));

    try {
      const finalInput =
        action === 'fix'
          ? `Broken ${cell.language || 'python'} code:\n${cell.content}\n\nError:\n${cell.outputs.find((o) => o.type === 'error')?.content || ''}`
          : promptInput;

      const result = await invokeModel(action, finalInput, extraParam, cell.language);

      updateActiveNotebook((nb) => ({
        ...nb,
        cells: nb.cells.map((c) =>
          c.id === cell.id
            ? {
                ...c,
                type: action === 'code' || action === 'fix' ? 'code' : c.type === 'photo' ? 'photo' : c.type,
                content:
                  action === 'translate'
                    ? `${c.content}\n\n> 🌍 **${extraParam}**:\n${result}`
                    : result,
                isAiGenerating: false,
              }
            : c
        ),
      }));
      notify('✨ Crafted by Aether');
    } catch (err: any) {
      notify(err.message || 'Aether could not complete request');
      updateActiveNotebook((nb) => ({
        ...nb,
        cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: false } : c)),
      }));
    }
  };

  const handlePrint = () => {
    if ((window as any).AndroidNotebookBridge?.printNotebook) {
      (window as any).AndroidNotebookBridge.printNotebook(activeNotebook.title);
    } else {
      window.print();
    }
  };

  const buildMarkdownString = (): string => {
    let md = `# ${activeNotebook.title}\n\n`;
    activeNotebook.cells.forEach((c) => {
      if (c.type === 'photo') {
        md += `📷 **${c.photoCaption || 'Snapshot'}**\n\n${c.content ? c.content + '\n\n' : ''}---\n\n`;
      } else if (c.type === 'code') {
        md += `\`\`\`${c.language || 'python'}\n${c.content}\n\`\`\`\n\n`;
      } else if (c.content.trim()) {
        md += `${c.content}\n\n---\n\n`;
      }
    });
    return md;
  };

  const shareOrDownloadText = async (filename: string, content: string, mime: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeNotebook.title,
          text: content,
        });
        return;
      } catch {}
    }
    const dataUri = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notify(`Saved ${filename}`);
  };

  const exportMarkdown = () => {
    const safeName = `${activeNotebook.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'notebook'}.md`;
    shareOrDownloadText(safeName, buildMarkdownString(), 'text/markdown');
  };

  const exportIpynb = () => {
    const ipynb = {
      cells: activeNotebook.cells.map((cell) => ({
        cell_type: cell.type === 'code' ? 'code' : 'markdown',
        metadata: {},
        source: cell.content.split('\n').map((l) => l + '\n'),
      })),
      metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' } },
      nbformat: 4,
      nbformat_minor: 5,
    };
    const safeName = `${activeNotebook.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'notebook'}.ipynb`;
    shareOrDownloadText(safeName, JSON.stringify(ipynb, null, 2), 'application/json');
  };

  const exportNotebookSnapshotCard = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render matching luxury stationery background
    const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
    if (isLightPaper) {
      grad.addColorStop(0, '#fffdf8');
      grad.addColorStop(1, '#ece2ce');
    } else {
      grad.addColorStop(0, '#0b0f1d');
      grad.addColorStop(0.55, '#19132c');
      grad.addColorStop(1, '#090d16');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    ctx.strokeStyle = isLightPaper ? 'rgba(180,130,60,0.45)' : 'rgba(234,88,12,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, 1008, 1278);

    ctx.fillStyle = isLightPaper ? '#1c1917' : '#f8fafc';
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(activeNotebook.title.slice(0, 38), 76, 118);

    ctx.fillStyle = isLightPaper ? '#78716c' : '#94a3b8';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`AI Notebook Pro • Crafted with Aether • ${new Date().toLocaleDateString()}`, 76, 162);

    const bodyText = activeNotebook.cells
      .map((c) => c.content || (c.photoCaption ? `[Photo: ${c.photoCaption}]` : ''))
      .filter(Boolean)
      .join('\n\n')
      .replace(/^#+\s*/gm, '');

    ctx.fillStyle = isLightPaper ? '#292524' : '#e2e8f0';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const words = bodyText.split(/\s+/);
    let line = '';
    let y = 236;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > 920) {
        ctx.fillText(line, 76, y);
        line = w;
        y += 42;
        if (y > 1230) break;
      } else {
        line = test;
      }
    }
    if (line && y <= 1230) ctx.fillText(line, 76, y);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'notebook_snapshot.png', { type: 'image/png' });
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: activeNotebook.title, files: [file] });
          return;
        } catch {}
      }
      const url = canvas.toDataURL('image/png');
      setPreviewImage(url);
      notify('📸 Snapshot Card ready (tap image to close)');
    }, 'image/png');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        if (file.name.endsWith('.json') || file.name.endsWith('.ipynb')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.cells)) {
            const mappedCells: NotebookCell[] = parsed.cells.map((c: any, i: number) => ({
              id: c.id || `c-${Date.now()}-${i}`,
              type: c.cell_type === 'code' || c.type === 'code' ? 'code' : 'markdown',
              language: 'python',
              content: Array.isArray(c.source) ? c.source.join('') : String(c.content || ''),
              outputs: [],
            }));
            const newDoc: NotebookDoc = {
              id: `nb-${Date.now()}`,
              title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              theme: activeNotebook.theme,
              ruling: activeNotebook.ruling,
              wallpaperOpacity: 88,
              cells: mappedCells,
            };
            setNotebooks((prev) => [newDoc, ...prev]);
            setActiveNotebookId(newDoc.id);
          }
        } else {
          const newDoc: NotebookDoc = {
            id: `nb-${Date.now()}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            theme: activeNotebook.theme,
            ruling: activeNotebook.ruling,
            wallpaperOpacity: 88,
            cells: [{ id: `c-${Date.now()}`, type: 'markdown', content: text, outputs: [] }],
          };
          setNotebooks((prev) => [newDoc, ...prev]);
          setActiveNotebookId(newDoc.id);
        }
        setShowNotebookShelf(false);
        notify('📂 Imported into new notebook!');
      } catch {
        notify('Could not parse imported file');
      }
    };
    reader.readAsText(file);
  };

  const getRulingClass = (ruling: PaperRuling) => {
    if (ruling === 'none') return '';
    const suffix = isLightPaper ? 'light' : 'dark';
    return `ruling-${ruling}-${suffix}`;
  };

  const filteredLanguages = WORLD_LANGUAGES.filter(
    (l) =>
      !langSearch.trim() ||
      l.nativeLabel.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.englishName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div
      className={`flex flex-col h-full w-full select-none relative overflow-hidden ${
        activeNotebook.theme !== 'custom-photo' ? `theme-${activeNotebook.theme}` : 'bg-[#080c16] text-slate-100'
      }`}
    >
      {activeNotebook.theme === 'custom-photo' && activeNotebook.customWallpaper && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 transition-opacity"
          style={{
            backgroundImage: `url(${activeNotebook.customWallpaper})`,
            opacity: (activeNotebook.wallpaperOpacity ?? 88) / 100,
          }}
        />
      )}

      {/* Hidden File Pickers */}
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
      <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      <input type="file" ref={wallpaperInputRef} accept="image/*" className="hidden" onChange={handleCustomWallpaperUpload} />
      <input type="file" ref={importInputRef} accept=".json,.md,.txt,.ipynb" className="hidden" onChange={handleImportFile} />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-amber-500/50 text-amber-200 text-xs font-semibold shadow-2xl no-print">
          {toastMsg}
        </div>
      )}

      {/* Top Studio Bar */}
      <header className="pt-9 pb-2.5 px-3 bg-slate-950/75 backdrop-blur-md border-b border-white/15 flex items-center justify-between gap-2 shadow-lg relative z-20 no-print text-white">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => setShowNotebookShelf(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-semibold text-white active:scale-95 transition min-w-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="max-w-[110px] truncate">{activeNotebook.title}</span>
            <ChevronDown className="w-3 h-3 text-slate-300 shrink-0" />
          </button>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-400 text-black rounded-md">
            AETHER AI
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLanguageModal(true)}
            title="World Languages"
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-bold text-cyan-200 active:scale-95 transition"
          >
            <span>{currentLang.flag}</span>
            <span className="uppercase">{currentLang.code}</span>
          </button>
          <button
            onClick={() => setShowStationeryModal(true)}
            title="Luxury Stationery"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-purple-300 active:scale-95 transition"
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            onClick={exportNotebookSnapshotCard}
            title="Snapshot Card"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 active:scale-95 transition"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            title="Print / Save PDF"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-300 active:scale-95 transition"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={exportMarkdown}
            title="Share / Export Note"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 active:scale-95 transition"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 active:scale-95 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* World Languages Modal (44 Countries / Languages) */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print text-white">
          <div className="bg-[#0f1629] border border-cyan-500/40 rounded-2xl p-4 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">World Languages (44 Regions • Voice & Aether AI)</h3>
              </div>
              <button onClick={() => setShowLanguageModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              placeholder="Search language or country..."
              className="mt-3 mb-2 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 py-1">
              {filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setCurrentLang(lang);
                    setShowLanguageModal(false);
                    notify(`${lang.flag} ${lang.nativeLabel} active`);
                  }}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                    currentLang.code === lang.code
                      ? 'border-cyan-400 bg-cyan-950/60 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{lang.nativeLabel}</div>
                    <div className="text-[10px] text-slate-400 truncate">{lang.englishName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Camera & Photo Snapshot Studio Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 no-print text-white">
          <div className="bg-[#10172b] border border-emerald-500/40 rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Camera & Photo Snapshot</h3>
              </div>
              <button
                onClick={() => {
                  stopLiveCameraStream();
                  setShowCameraModal(false);
                }}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {cameraStreamActive ? (
              <div className="relative rounded-xl overflow-hidden bg-black border border-white/15 aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <button
                  onClick={flipLiveCamera}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-black/65 border border-white/20 text-xs font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Flip
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-6 text-center text-xs text-slate-300">
                Tap <strong>Phone Camera</strong> or <strong>Photo Gallery</strong> below to insert a crisp HD photo into your note.
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              {cameraStreamActive ? (
                <button
                  onClick={captureLiveVideoSnapshot}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                >
                  <Camera className="w-4 h-4" /> Snap Now
                </button>
              ) : (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                >
                  <Camera className="w-4 h-4" /> Camera
                </button>
              )}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="py-2.5 bg-cyan-600/40 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-100 flex items-center justify-center gap-1"
              >
                📷 System Cam
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="py-2.5 bg-purple-600/40 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-100 flex items-center justify-center gap-1"
              >
                🖼️ Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notebooks Shelf Modal */}
      {showNotebookShelf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print text-white">
          <div className="bg-[#10172b] border border-cyan-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">{ui.notebooks}</h3>
              </div>
              <button onClick={() => setShowNotebookShelf(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {notebooks.map((nb) => (
                <div
                  key={nb.id}
                  onClick={() => {
                    setActiveNotebookId(nb.id);
                    setShowNotebookShelf(false);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    activeNotebookId === nb.id ? 'border-cyan-500 bg-cyan-950/40' : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <input
                      type="text"
                      value={nb.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setNotebooks((prev) => prev.map((n) => (n.id === nb.id ? { ...n, title: e.target.value } : n)))
                      }
                      className="bg-transparent text-xs font-bold text-white w-full focus:outline-none select-text"
                    />
                  </div>
                  <button onClick={(e) => deleteNotebook(e, nb.id)} className="p-1 text-slate-400 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-700 flex gap-2">
              <button
                onClick={createNewNotebook}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> {ui.newNotebook}
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
              >
                <Upload className="w-3.5 h-3.5" /> {ui.importBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned 24-Design Luxury Stationery & Paper Ruling Studio */}
      {showStationeryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print text-white">
          <div className="bg-[#10172b] border border-purple-500/40 rounded-2xl p-4 max-w-md w-full shadow-2xl relative max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm">{ui.stationeryTitle} (24 Surfaces)</h3>
              </div>
              <button onClick={() => setShowStationeryModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Paper Rulings */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-2">{ui.paperRuling}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {PAPER_RULINGS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => updateActiveNotebook((nb) => ({ ...nb, ruling: r.id }))}
                      className={`p-2 rounded-xl border text-center transition ${
                        activeNotebook.ruling === r.id
                          ? 'border-purple-400 bg-purple-950/60 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="text-sm">{r.icon}</div>
                      <div className="text-[9px] font-semibold mt-0.5 leading-tight">{r.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Stationery Opacity Slider */}
              {activeNotebook.theme === 'custom-photo' && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-200">
                    <span>{ui.photoOpacity}</span>
                    <span>{activeNotebook.wallpaperOpacity ?? 88}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={activeNotebook.wallpaperOpacity ?? 88}
                    onChange={(e) => updateActiveNotebook((nb) => ({ ...nb, wallpaperOpacity: Number(e.target.value) }))}
                    className="w-full accent-purple-500"
                  />
                  <button
                    onClick={() => wallpaperInputRef.current?.click()}
                    className="w-full py-1.5 mt-1 bg-purple-600/30 border border-purple-500/40 rounded-lg text-xs font-semibold text-purple-200"
                  >
                    🖼️ Change Custom Stationery Image
                  </button>
                </div>
              )}

              {/* 24 Curated Stationery Swatches */}
              {(['Dark Luxe', 'Fine Paper & Marble', 'Artisan & Atmospheric'] as const).map((cat) => (
                <div key={cat}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{cat}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {LUXURY_STATIONERY_CATALOG.filter((t) => t.category === cat).map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() =>
                          theme.id === 'custom-photo'
                            ? wallpaperInputRef.current?.click()
                            : updateActiveNotebook((nb) => ({ ...nb, theme: theme.id }))
                        }
                        className={`p-2 rounded-xl border flex items-center gap-2.5 text-left transition ${
                          activeNotebook.theme === theme.id
                            ? 'border-amber-400 ring-1 ring-amber-400/50 bg-slate-900'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-sm shrink-0 shadow-inner"
                          style={{ background: theme.swatchStyle }}
                        >
                          {theme.icon}
                        </div>
                        <span className="text-xs font-semibold text-slate-100 leading-tight">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowStationeryModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition mt-2"
            >
              {ui.done}
            </button>
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div className="bg-[#10172b]/95 border-b border-cyan-500/30 p-4 space-y-3 relative z-20 backdrop-blur-md no-print text-white">
          <div className="flex justify-between items-center text-xs font-semibold text-amber-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Aether Sovereign AI Active (No Key Needed)
            </span>
            <button onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as AIModelType)}
            className="w-full text-xs bg-[#080c16] border border-cyan-500/40 rounded-lg px-2.5 py-2 text-cyan-100 focus:outline-none"
          >
            <option value="aether-sovereign">✨ Aether Sovereign AI (Built-In • Viper Studios 24/7)</option>
            <option value="gemini-1.5-flash">Custom Google Gemini 1.5 Flash (Optional Key)</option>
            <option value="gemini-1.5-pro">Custom Google Gemini 1.5 Pro (Optional Key)</option>
          </select>
          {selectedModel !== 'aether-sovereign' && (
            <input
              type="password"
              placeholder="Optional: Paste your own Gemini API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-xs bg-[#080c16] border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-cyan-200 focus:outline-none select-text"
            />
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={exportIpynb}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-200 font-semibold flex items-center justify-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> Export .ipynb
            </button>
            <button
              onClick={exportMarkdown}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-200 font-semibold flex items-center justify-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" /> Share / Export .md
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Image / Snapshot Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer no-print"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
        </div>
      )}

      {/* Main Notebook Canvas */}
      <main className={`flex-1 overflow-y-auto p-3 space-y-3 pb-28 relative z-10 ${getRulingClass(activeNotebook.ruling)}`}>
        {activeNotebook.cells.map((cell, idx) => {
          const hasError = cell.outputs.some((o) => o.type === 'error');
          const isMicActive = isRecording === cell.id;

          const cardClass = isLightPaper
            ? activeCellId === cell.id
              ? 'border-amber-600/70 bg-white/80 text-stone-900 shadow-md'
              : 'border-stone-400/45 bg-white/65 text-stone-900 shadow-sm'
            : activeCellId === cell.id
              ? 'border-cyan-400/80 bg-slate-950/80 text-slate-100 shadow-lg'
              : 'border-white/12 bg-slate-950/60 text-slate-100';

          const headerBarClass = isLightPaper
            ? 'border-stone-300/70 bg-stone-900/10 text-stone-700'
            : 'border-white/10 bg-black/35 text-slate-300';

          return (
            <div
              key={cell.id}
              onClick={() => setActiveCellId(cell.id)}
              className={`note-cell-container rounded-2xl border transition-all duration-150 backdrop-blur-sm ${cardClass}`}
            >
              <div className={`flex items-center justify-between px-3 py-1.5 border-b text-[11px] rounded-t-2xl no-print ${headerBarClass}`}>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-60 font-mono">[{idx + 1}]</span>
                  {cell.type === 'code' ? (
                    <select
                      value={cell.language || 'python'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateCellLanguage(cell.id, e.target.value as CellLanguage)}
                      className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 uppercase border border-cyan-500/30 focus:outline-none"
                    >
                      {CODE_LANGUAGES.map((l) => (
                        <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                          {l.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="uppercase text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900/80 text-amber-300">
                      {cell.type === 'ai' ? '✨ AETHER AI' : cell.type}
                    </span>
                  )}
                  {cell.isAiGenerating && (
                    <span className="text-[10px] font-semibold text-amber-500 animate-pulse">Aether crafting...</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSpeechRecognition(cell.id);
                    }}
                    title="Voice Dictation"
                    className={`p-1.5 rounded-lg border transition ${
                      isMicActive ? 'bg-rose-600 text-white border-rose-400 animate-pulse' : 'bg-slate-900/75 text-white border-white/15'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                  </button>
                  {cell.type === 'code' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAIAction(cell, 'draft');
                        }}
                        title="Explain Code with Aether"
                        className="p-1.5 rounded-lg bg-slate-900/75 text-white border border-white/15"
                      >
                        <HelpCircle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAIAction(cell, 'code');
                        }}
                        title="Generate Code with Aether"
                        className="p-1.5 rounded-lg bg-slate-900/75 text-amber-300 border border-amber-500/30"
                      >
                        <Zap className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          runCell(cell);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
                      >
                        <Play className="w-3 h-3" /> {cell.isExecuting ? '...' : 'Run'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCell(cell.id);
                    }}
                    className="text-rose-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dedicated Aether Prompt Bar on AI Cells */}
              {cell.type === 'ai' && (
                <div className="p-2.5 border-b border-amber-500/25 bg-slate-950/75 flex gap-2 no-print">
                  <input
                    type="text"
                    placeholder={ui.aetherPromptPlaceholder}
                    value={cell.aiPrompt || ''}
                    onChange={(e) =>
                      updateActiveNotebook((nb) => ({
                        ...nb,
                        cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, aiPrompt: e.target.value } : c)),
                      }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleAIAction(cell, 'draft')}
                    className="flex-1 bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none select-text"
                  />
                  <button
                    disabled={cell.isAiGenerating}
                    onClick={() => handleAIAction(cell, 'draft')}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-black rounded-xl text-xs font-extrabold shrink-0 active:scale-95 transition"
                  >
                    {cell.isAiGenerating ? '...' : ui.generate}
                  </button>
                </div>
              )}

              {/* Photo / Camera Cell */}
              {cell.type === 'photo' && (
                <div className="p-3 space-y-2">
                  {cell.photoUrl ? (
                    <div className="space-y-2">
                      <div
                        className="relative rounded-xl overflow-hidden border border-white/20 max-h-72 cursor-pointer"
                        onClick={() => setPreviewImage(cell.photoUrl || null)}
                      >
                        <img src={cell.photoUrl} className="w-full object-cover max-h-72 rounded-xl" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Add photo caption or topic..."
                          value={cell.photoCaption || ''}
                          onChange={(e) =>
                            updateActiveNotebook((nb) => ({
                              ...nb,
                              cells: nb.cells.map((c) => (c.id === cell.id ? { ...c, photoCaption: e.target.value } : c)),
                            }))
                          }
                          className="flex-1 bg-transparent text-xs italic border-b border-current/20 pb-1 focus:outline-none select-text"
                        />
                        <button
                          onClick={() => openCameraStudio(cell.id)}
                          className="px-2 py-1 rounded-lg bg-slate-900/80 text-white text-[10px] font-semibold no-print"
                        >
                          📷 Retake
                        </button>
                        <button
                          onClick={() => handleAIAction(cell, 'draft')}
                          className="px-2 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-bold no-print"
                        >
                          ✨ Aether Notes
                        </button>
                      </div>
                      {cell.content && (
                        <textarea
                          value={cell.content}
                          onChange={(e) => updateCellContent(cell.id, e.target.value)}
                          rows={Math.max(2, cell.content.split('\n').length)}
                          className="w-full bg-transparent text-xs leading-relaxed resize-none focus:outline-none select-text pt-1"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 py-4 justify-center no-print">
                      <button
                        onClick={() => openCameraStudio(cell.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                      >
                        <Camera className="w-4 h-4" /> Take Snapshot
                      </button>
                      <button
                        onClick={() => {
                          setCameraTargetCellId(cell.id);
                          galleryInputRef.current?.click();
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
                      >
                        <ImageIcon className="w-4 h-4" /> Choose Gallery
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Text / Markdown / Code Editor */}
              {cell.type !== 'photo' && (
                <div className="p-3">
                  <textarea
                    value={cell.content}
                    onChange={(e) => updateCellContent(cell.id, e.target.value)}
                    rows={Math.max(3, cell.content.split('\n').length)}
                    placeholder={cell.type === 'code' ? 'Write code or tap ⚡ above for Aether...' : ui.notePlaceholder}
                    className={`w-full bg-transparent ${
                      cell.type === 'code' ? 'font-mono text-xs' : 'text-sm'
                    } text-inherit placeholder-current/45 resize-none focus:outline-none leading-relaxed select-text`}
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Aether Writing & Polyglot Action Bar */}
              {(cell.type === 'markdown' || cell.type === 'ai') && (
                <div className="px-3 py-2 bg-slate-950/75 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-print relative text-white rounded-b-2xl">
                  <span className="text-[10px] font-bold text-amber-400 mr-0.5 flex items-center gap-0.5 shrink-0">
                    <Sparkles className="w-3 h-3" /> Aether:
                  </span>
                  <button
                    disabled={cell.isAiGenerating}
                    onClick={() => handleAIAction(cell, 'draft')}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-amber-200 shrink-0"
                  >
                    {ui.craftExpand}
                  </button>
                  <button
                    disabled={cell.isAiGenerating}
                    onClick={() => handleAIAction(cell, 'polish')}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-cyan-200 shrink-0"
                  >
                    {ui.polish}
                  </button>
                  <button
                    disabled={cell.isAiGenerating}
                    onClick={() => handleAIAction(cell, 'summarize')}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-emerald-200 shrink-0"
                  >
                    {ui.summarize}
                  </button>
                  <button
                    disabled={cell.isAiGenerating}
                    onClick={() => handleAIAction(cell, 'brainstorm')}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-purple-200 shrink-0"
                  >
                    {ui.brainstorm}
                  </button>
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTranslateMenu(showTranslateMenu === cell.id ? null : cell.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/40 border border-indigo-400/30 text-[10px] font-semibold text-indigo-100 flex items-center gap-1"
                    >
                      {ui.translate} ▾
                    </button>
                    {showTranslateMenu === cell.id && (
                      <div className="fixed left-4 right-4 bottom-20 max-w-sm mx-auto bg-[#0f1629] border border-indigo-500/50 rounded-2xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto grid grid-cols-2 gap-1">
                        {WORLD_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setShowTranslateMenu(null);
                              handleAIAction(cell, 'translate', `${lang.englishName} (${lang.nativeLabel})`);
                            }}
                            className="text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-100 hover:bg-indigo-600/40 flex items-center gap-1.5"
                          >
                            <span>{lang.flag}</span>
                            <span className="truncate">{lang.nativeLabel}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Auto-Fix Error Bar */}
              {hasError && (
                <div className="px-3 py-2 bg-rose-950/85 border-t border-rose-500/40 flex items-center justify-between no-print text-white">
                  <div className="flex items-center gap-1.5 text-xs text-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Error detected</span>
                  </div>
                  <button
                    onClick={() => handleAIAction(cell, 'fix')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg"
                  >
                    <Wrench className="w-3 h-3" /> ✨ Fix with Aether
                  </button>
                </div>
              )}

              {/* Code Execution Output */}
              {cell.outputs && cell.outputs.length > 0 && (
                <div className="p-3 bg-slate-950/90 border-t border-white/15 font-mono text-[11px] rounded-b-2xl overflow-x-auto text-white">
                  {cell.outputs.map((out) => (
                    <div key={out.id} className={out.type === 'error' ? 'text-rose-400 whitespace-pre-wrap' : 'text-emerald-300 whitespace-pre-wrap'}>
                      {out.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* Bottom Action Dock */}
      <footer className="fixed bottom-0 left-0 right-0 p-2.5 bg-slate-950/85 backdrop-blur-xl border-t border-white/15 flex items-center justify-around gap-1.5 z-20 shadow-2xl no-print">
        <button
          onClick={() => addCell('ai')}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500/30 to-amber-500/30 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-200 active:scale-95 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {ui.addAether}
        </button>
        <button
          onClick={() => addCell('markdown')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/15 rounded-xl text-xs font-bold text-slate-100 active:scale-95 transition"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-300" /> {ui.addText}
        </button>
        <button
          onClick={() => addCell('code')}
          className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600/25 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-200 active:scale-95 transition"
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" /> {ui.addCode}
        </button>
        <button
          onClick={() => openCameraStudio(undefined)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/25 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-200 active:scale-95 transition"
        >
          <Camera className="w-3.5 h-3.5 text-emerald-400" /> {ui.addPhoto}
        </button>
      </footer>
    </div>
  );
};

export default App;
