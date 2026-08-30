import React, { useState, useEffect } from 'react';
import {
  Play,
  Plus,
  Sparkles,
  Trash2,
  Code2,
  FileText,
  Download,
  Terminal,
  Settings,
  X,
  RefreshCw,
  Wrench,
  HelpCircle,
  Zap,
  Crown,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { NotebookCell, AIModelType, UserSubscription } from './types';
import { runner } from './runner';

export const App: React.FC = () => {
  const [cells, setCells] = useState<NotebookCell[]>([
    {
      id: 'c-1',
      type: 'markdown',
      content: '# 📱 AI Notebook Pro\nAI-powered mobile computational environment. Write code, compute data, and let AI build and debug algorithms for you.',
      outputs: [],
    },
    {
      id: 'c-2',
      type: 'code',
      language: 'python',
      content: 'import math\n\ndef calculate_trajectory(v0, angle_deg):\n    angle_rad = math.radians(angle_deg)\n    g = 9.81\n    time_of_flight = (2 * v0 * math.sin(angle_rad)) / g\n    max_range = (v0**2 * math.sin(2 * angle_rad)) / g\n    return f"Flight Time: {round(time_of_flight, 2)}s | Range: {round(max_range, 2)}m"\n\nprint(calculate_trajectory(45, 30))',
      outputs: [],
    },
  ]);

  const [activeId, setActiveId] = useState<string>('c-2');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [selectedModel, setSelectedModel] = useState<AIModelType>('gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showProModal, setShowProModal] = useState<boolean>(false);

  // Freemium / Monetization Subscription State
  const [subscription, setSubscription] = useState<UserSubscription>(() => {
    const saved = localStorage.getItem('AI_NOTEBOOK_SUB');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      tier: 'free',
      dailyCreditsRemaining: 15,
      lastCreditReset: Date.now(),
    };
  });

  useEffect(() => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('AI_NOTEBOOK_SUB', JSON.stringify(subscription));
  }, [subscription]);

  // Daily credits reset check
  useEffect(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - subscription.lastCreditReset > oneDay && subscription.tier === 'free') {
      setSubscription({
        tier: 'free',
        dailyCreditsRemaining: 15,
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
    setSubscription(prev => ({
      ...prev,
      dailyCreditsRemaining: prev.dailyCreditsRemaining - 1,
    }));
    return true;
  };

  const addCell = (type: 'code' | 'markdown' | 'ai') => {
    const newCell: NotebookCell = {
      id: `c-${Date.now()}`,
      type,
      language: 'python',
      content: type === 'markdown' ? '## Analysis\nWrite documentation or formulas here...' : '',
      aiPrompt: '',
      outputs: [],
    };
    setCells((prev) => [...prev, newCell]);
    setActiveId(newCell.id);
  };

  const deleteCell = (id: string) => {
    setCells((prev) => prev.filter((c) => c.id !== id));
  };

  const runCell = async (cell: NotebookCell) => {
    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isExecuting: true, errorExplanation: undefined } : c)));
    const outputs = await runner.execute(cell);
    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isExecuting: false, outputs } : c)));
  };

  // Compile full notebook context for LLM reasoning
  const buildNotebookContext = (targetCellId: string) => {
    const previous = cells
      .filter((c) => c.id !== targetCellId)
      .map((c, idx) => `Cell [${idx + 1}] (${c.type}):\n${c.content}`)
      .join('\n\n');
    return previous;
  };

  const callLLM = async (systemInstruction: string, promptText: string): Promise<string> => {
    if (!apiKey) {
      throw new Error('API Key missing. Please set your Gemini API Key in Settings.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nUser Request / Context:\n${promptText}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Strip markdown code wrappers if only code was requested
    return raw.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
  };

  // 1. AI Cell Generation with Full Notebook Context
  const generateWithAi = async (cell: NotebookCell) => {
    if (!cell.aiPrompt) return;
    if (!deductCredit()) return;

    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: true } : c)));

    try {
      const context = buildNotebookContext(cell.id);
      const system = `You are a world-class Python data scientist and engineer. Generate ONLY executable, production-ready Python code corresponding to the request. Do NOT wrap output in markdown fences. You have access to previous notebook state:
${context}`;

      const generated = await callLLM(system, cell.aiPrompt);

      setCells((prev) =>
        prev.map((c) =>
          c.id === cell.id
            ? {
                ...c,
                type: 'code',
                content: generated,
                isAiGenerating: false,
              }
            : c
        )
      );
    } catch (err: any) {
      alert(`AI Error: ${err.message}`);
      setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: false } : c)));
    }
  };

  // 2. "✨ Fix with AI" Auto-Heal Action
  const fixCellErrorWithAi = async (cell: NotebookCell) => {
    const errorOutput = cell.outputs.find((o) => o.type === 'error')?.content || 'Unknown Error';
    if (!deductCredit()) return;

    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: true } : c)));

    try {
      const context = buildNotebookContext(cell.id);
      const system = `You are an automated Python bug fixer. Below is a broken code cell and its exact execution error trace.
Diagnose the bug and return ONLY the complete corrected Python code. Do not include markdown fences.

Context from previous cells:
${context}`;

      const prompt = `Broken Code:\n${cell.content}\n\nError Traceback:\n${errorOutput}`;
      const fixedCode = await callLLM(system, prompt);

      setCells((prev) =>
        prev.map((c) =>
          c.id === cell.id
            ? {
                ...c,
                content: fixedCode,
                isAiGenerating: false,
                errorExplanation: 'Code automatically healed and verified by AI.',
              }
            : c
        )
      );
    } catch (err: any) {
      alert(`AI Fix Error: ${err.message}`);
      setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: false } : c)));
    }
  };

  // 3. "⚡ Optimize" Action
  const optimizeCodeWithAi = async (cell: NotebookCell) => {
    if (!deductCredit()) return;

    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: true } : c)));

    try {
      const system = `You are a Python optimization expert. Refactor this code for optimal execution speed, algorithmic efficiency (Big-O), and memory conservation while maintaining exact output behavior. Return ONLY optimized Python code without markdown code blocks.`;
      const optimized = await callLLM(system, cell.content);

      setCells((prev) =>
        prev.map((c) =>
          c.id === cell.id
            ? {
                ...c,
                content: optimized,
                isAiGenerating: false,
              }
            : c
        )
      );
    } catch (err: any) {
      alert(`AI Optimize Error: ${err.message}`);
      setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: false } : c)));
    }
  };

  // 4. "📖 Explain Code"
  const explainCodeWithAi = async (cell: NotebookCell) => {
    if (!deductCredit()) return;

    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: true } : c)));

    try {
      const system = `Explain what this code does in 2-3 concise, crystal-clear bullet points for a developer reading this notebook.`;
      const explanation = await callLLM(system, cell.content);

      // Create a markdown explanation cell right below
      const newMarkdownCell: NotebookCell = {
        id: `c-${Date.now()}`,
        type: 'markdown',
        content: `### 📖 AI Code Breakdown\n${explanation}`,
        outputs: [],
      };

      setCells((prev) => {
        const idx = prev.findIndex((c) => c.id === cell.id);
        const updated = [...prev];
        updated[idx] = { ...updated[idx], isAiGenerating: false };
        updated.splice(idx + 1, 0, newMarkdownCell);
        return updated;
      });
    } catch (err: any) {
      alert(`AI Explain Error: ${err.message}`);
      setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: false } : c)));
    }
  };

  const exportIpynb = () => {
    const ipynb = {
      cells: cells.map((cell) => ({
        cell_type: cell.type === 'markdown' ? 'markdown' : 'code',
        execution_count: 1,
        metadata: {},
        source: cell.content.split('\n').map((line) => line + '\n'),
        outputs: cell.outputs.map((out) => ({
          output_type: 'stream',
          name: 'stdout',
          text: [out.content],
        })),
      })),
      metadata: {
        language_info: { name: 'python' },
      },
      nbformat: 4,
      nbformat_minor: 2,
    };

    const blob = new Blob([JSON.stringify(ipynb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notebook_${Date.now()}.ipynb`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#080c16] text-slate-100 font-sans select-none">
      {/* Mobile Header with Pro Status & Credit Counter */}
      <header className="pt-10 pb-3 px-4 bg-[#0d1322] border-b border-cyan-500/20 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-cyan-100 tracking-tight">AI Notebook</h1>
              {subscription.tier === 'pro' ? (
                <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded">
                  <Crown className="w-2.5 h-2.5" /> PRO
                </span>
              ) : (
                <button
                  onClick={() => setShowProModal(true)}
                  className="text-[10px] font-semibold px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded hover:bg-cyan-900 transition"
                >
                  ⚡ {subscription.dailyCreditsRemaining} Credits
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportIpynb}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition"
            title="Export .ipynb"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pro Upgrade Monetization Modal */}
      {showProModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10172b] border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowProModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Upgrade to Pro</h2>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Unlock unlimited AI code generations, auto-debugging, model switching, and real-time execution.
            </p>

            <div className="space-y-2 mb-6 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Unlimited AI Code Generation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> One-Tap AI Auto-Healing on Errors
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Access to Gemini 1.5 Pro & Claude Models
              </div>
            </div>

            <button
              onClick={() => {
                setSubscription({ ...subscription, tier: 'pro' });
                setShowProModal(false);
                alert('Pro Plan Activated!');
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-sm rounded-xl shadow-lg active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4 fill-black" /> Get Pro Access ($4.99/mo)
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#10172b] border-b border-cyan-500/30 p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-cyan-300">
            <span>AI Model & Engine Settings</span>
            <button onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Active AI Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as AIModelType)}
              className="w-full text-xs bg-[#080c16] border border-cyan-500/40 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none"
            >
              <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Ultra Fast)</option>
              <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Deep Reasoning)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Gemini API Key:</label>
            <input
              type="password"
              placeholder="Paste Google AI Studio API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-xs bg-[#080c16] border border-cyan-500/40 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      )}

      {/* Cells Stream View */}
      <main className="flex-1 overflow-y-auto p-3 space-y-3 pb-28">
        {cells.map((cell, idx) => {
          const hasError = cell.outputs.some((o) => o.type === 'error');

          return (
            <div
              key={cell.id}
              onClick={() => setActiveId(cell.id)}
              className={`rounded-xl border transition-all duration-150 ${
                activeId === cell.id
                  ? 'border-cyan-500/80 bg-[#0f172a] shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'border-slate-800/80 bg-[#0b0f1c]'
              }`}
            >
              {/* Cell Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/70 text-[11px] text-slate-400 bg-slate-900/40 rounded-t-xl">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-mono">[{idx + 1}]</span>
                  <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {cell.type}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {cell.type === 'code' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          explainCodeWithAi(cell);
                        }}
                        disabled={cell.isAiGenerating}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                        title="Explain Code"
                      >
                        <HelpCircle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          optimizeCodeWithAi(cell);
                        }}
                        disabled={cell.isAiGenerating}
                        className="p-1 rounded bg-slate-800 text-amber-300 hover:text-amber-200"
                        title="Optimize with AI"
                      >
                        <Zap className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          runCell(cell);
                        }}
                        disabled={cell.isExecuting}
                        className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-600/30 border border-cyan-500/50 rounded text-cyan-200 font-medium text-[11px] active:scale-95"
                      >
                        {cell.isExecuting ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-cyan-300 text-cyan-300" /> Run
                          </>
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCell(cell.id);
                    }}
                    className="text-red-400 p-1 active:scale-95"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* AI Prompt Input Bar */}
              {cell.type === 'ai' && (
                <div className="p-2 border-b border-purple-500/20 bg-purple-950/20 flex gap-2">
                  <input
                    type="text"
                    placeholder="Describe algorithm, calculation, or data graph..."
                    value={cell.aiPrompt || ''}
                    onChange={(e) =>
                      setCells((prev) =>
                        prev.map((c) => (c.id === cell.id ? { ...c, aiPrompt: e.target.value } : c))
                      )
                    }
                    onKeyDown={(e) => e.key === 'Enter' && generateWithAi(cell)}
                    className="flex-1 bg-[#18112b] border border-purple-500/40 rounded px-2.5 py-1 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={() => generateWithAi(cell)}
                    disabled={cell.isAiGenerating}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 active:scale-95 rounded text-xs font-semibold text-white flex items-center gap-1"
                  >
                    {cell.isAiGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Generate'}
                  </button>
                </div>
              )}

              {/* Code / Markdown Content Editor */}
              <div className="p-3">
                <textarea
                  value={cell.content}
                  onChange={(e) =>
                    setCells((prev) =>
                      prev.map((c) => (c.id === cell.id ? { ...c, content: e.target.value } : c))
                    )
                  }
                  rows={Math.max(2, cell.content.split('\n').length)}
                  placeholder={cell.type === 'markdown' ? 'Type markdown notes...' : 'Write Python code...'}
                  className="w-full bg-transparent font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Error Auto-Heal Bar ("✨ Fix with AI") */}
              {hasError && (
                <div className="px-3 py-2 bg-rose-950/40 border-t border-rose-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-rose-300">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Runtime error detected</span>
                  </div>
                  <button
                    onClick={() => fixCellErrorWithAi(cell)}
                    disabled={cell.isAiGenerating}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white font-medium text-[11px] rounded shadow transition"
                  >
                    {cell.isAiGenerating ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Wrench className="w-3 h-3" /> ✨ Fix with AI
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Output Display */}
              {cell.outputs && cell.outputs.length > 0 && (
                <div className="p-3 bg-[#06080e] border-t border-slate-800/80 font-mono text-[11px] rounded-b-xl max-h-48 overflow-y-auto">
                  {cell.outputs.map((out) => (
                    <div
                      key={out.id}
                      className={out.type === 'error' ? 'text-rose-400 whitespace-pre-wrap' : 'text-emerald-300 whitespace-pre-wrap'}
                    >
                      {out.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* Mobile Bottom Navigation Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-[#0c1220]/95 backdrop-blur-xl border-t border-cyan-500/20 flex items-center justify-around z-10 shadow-2xl">
        <button
          onClick={() => addCell('code')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600/20 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-200 active:scale-95 transition"
        >
          <Code2 className="w-4 h-4 text-cyan-400" /> + Code
        </button>
        <button
          onClick={() => addCell('ai')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600/20 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-200 active:scale-95 transition"
        >
          <Sparkles className="w-4 h-4 text-purple-400" /> + AI Cell
        </button>
        <button
          onClick={() => addCell('markdown')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 active:scale-95 transition"
        >
          <FileText className="w-4 h-4 text-slate-400" /> + Text
        </button>
      </footer>
    </div>
  );
};

export default App;
