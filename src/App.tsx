import React, { useState, useEffect } from 'react';
import { Play, Plus, Sparkles, Trash2, Code2, FileText, Download, Terminal, Settings, X, RefreshCw } from 'lucide-react';
import { NotebookCell } from './types';
import { runner } from './runner';

export const App: React.FC = () => {
  const [cells, setCells] = useState<NotebookCell[]>([
    {
      id: 'c-1',
      type: 'markdown',
      content: '# 📱 AI Mobile Notebook\nRun Python & JS directly on your device with AI code generation.',
      outputs: [],
    },
    {
      id: 'c-2',
      type: 'code',
      language: 'python',
      content: 'import math\n\ndef calculate_radius(area):\n    return math.sqrt(area / math.pi)\n\nprint("Radius for area 100:", round(calculate_radius(100), 3))',
      outputs: [],
    },
  ]);

  const [activeId, setActiveId] = useState<string>('c-1');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
  }, [apiKey]);

  const addCell = (type: 'code' | 'markdown' | 'ai') => {
    const newCell: NotebookCell = {
      id: `c-${Date.now()}`,
      type,
      language: 'python',
      content: type === 'markdown' ? '## Notes\nWrite markdown here...' : '',
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
    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isExecuting: true } : c)));
    const outputs = await runner.execute(cell);
    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isExecuting: false, outputs } : c)));
  };

  const generateWithAi = async (cell: NotebookCell) => {
    if (!cell.aiPrompt) return;
    setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, isAiGenerating: true } : c)));

    try {
      let generatedCode = `# AI Solution for: ${cell.aiPrompt}\nimport math\n\ndef solution():\n    return f"Computed analysis for: {${JSON.stringify(cell.aiPrompt)}}"\n\nprint(solution())`;

      if (apiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an expert Python data scientist. Generate ONLY valid, clean Python code without markdown code fences for this prompt: ${cell.aiPrompt}`,
                    },
                  ],
                },
              ],
            }),
          }
        );
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          generatedCode = rawText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
        }
      }

      setCells((prev) =>
        prev.map((c) =>
          c.id === cell.id
            ? {
                ...c,
                type: 'code',
                content: generatedCode,
                isAiGenerating: false,
              }
            : c
        )
      );
    } catch {
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
    a.download = `mobile_notebook_${Date.now()}.ipynb`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#090d16] text-slate-100 font-sans select-none">
      {/* Mobile Safe Top Header */}
      <header className="pt-10 pb-3 px-4 bg-[#0e1424] border-b border-cyan-500/20 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h1 className="font-bold text-base text-cyan-100 tracking-tight">AI Notebook</h1>
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="bg-[#121a2d] border-b border-cyan-500/30 p-4 space-y-2 animate-in fade-in duration-150">
          <div className="flex justify-between items-center text-xs font-semibold text-cyan-300">
            <span>AI Configuration</span>
            <button onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">Enter your Gemini API key to enable live AI generation:</p>
          <input
            type="password"
            placeholder="AI Studio API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full text-xs bg-[#090d16] border border-cyan-500/40 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400"
          />
        </div>
      )}

      {/* Cells List View */}
      <main className="flex-1 overflow-y-auto p-3 space-y-3 pb-28">
        {cells.map((cell, idx) => (
          <div
            key={cell.id}
            onClick={() => setActiveId(cell.id)}
            className={`rounded-xl border transition-all duration-150 ${
              activeId === cell.id
                ? 'border-cyan-500/70 bg-[#10172a] shadow-[0_0_12px_rgba(6,182,212,0.12)]'
                : 'border-slate-800/80 bg-[#0c101b]'
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

              <div className="flex items-center gap-2">
                {cell.type === 'code' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      runCell(cell);
                    }}
                    disabled={cell.isExecuting}
                    className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600/30 border border-cyan-500/50 rounded text-cyan-200 font-medium text-[11px] active:scale-95"
                  >
                    {cell.isExecuting ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-cyan-300 text-cyan-300" /> Run
                      </>
                    )}
                  </button>
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

            {/* AI Generator Input */}
            {cell.type === 'ai' && (
              <div className="p-2 border-b border-purple-500/20 bg-purple-950/20 flex gap-2">
                <input
                  type="text"
                  placeholder="Describe what to compute or generate..."
                  value={cell.aiPrompt || ''}
                  onChange={(e) =>
                    setCells((prev) =>
                      prev.map((c) => (c.id === cell.id ? { ...c, aiPrompt: e.target.value } : c))
                    )
                  }
                  onKeyDown={(e) => e.key === 'Enter' && generateWithAi(cell)}
                  className="flex-1 bg-[#1a122e] border border-purple-500/40 rounded px-2.5 py-1 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
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

            {/* Code / Text Editor Area */}
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

            {/* Output View */}
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
        ))}
      </main>

      {/* Mobile Fixed Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-[#0d1322]/95 backdrop-blur-xl border-t border-cyan-500/20 flex items-center justify-around z-10 shadow-2xl">
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
