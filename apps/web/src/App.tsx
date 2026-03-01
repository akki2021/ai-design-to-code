import { useState, useEffect, useCallback, useRef } from 'react';
import { Playground } from './Playground';

const MIN_LEFT_WIDTH = 80;
const COLLAPSED_WIDTH = 36;

function App() {
  const [activeTab, setActiveTab] = useState<'url' | 'json'>('url');

  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tree?: any; code?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Resize state for the main split ───
  const mainRef = useRef<HTMLDivElement>(null);
  const [leftFraction, setLeftFraction] = useState(0.3); // 30% default
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('figma_token');
    if (savedToken) setFigmaToken(savedToken);
  }, []);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFigmaToken(val);
    localStorage.setItem('figma_token', val);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let payload: any = {};

      if (activeTab === 'url') {
        if (!figmaUrl || !figmaToken) {
          throw new Error('Please provide both a Figma URL and a Personal Access Token.');
        }
        payload = { figmaUrl, figmaToken };
      } else {
        payload = JSON.parse(jsonInput);
      }

      const response = await fetch('http://localhost:4000/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to parse Figma design');
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Invalid Request or Server Error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Drag resize logic ───
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = x / rect.width;

      if (x < MIN_LEFT_WIDTH) {
        setIsLeftCollapsed(true);
        setLeftFraction(COLLAPSED_WIDTH / rect.width);
      } else {
        setIsLeftCollapsed(false);
        setLeftFraction(Math.min(Math.max(fraction, 0.15), 0.55));
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleLeftCollapse = () => {
    if (isLeftCollapsed) {
      setIsLeftCollapsed(false);
      setLeftFraction(0.3);
    } else {
      setIsLeftCollapsed(true);
      setLeftFraction(0);
    }
  };

  const isGenerateDisabled = loading || (activeTab === 'url' ? (!figmaUrl || !figmaToken) : !jsonInput);

  const leftWidthStyle = isLeftCollapsed ? `${COLLAPSED_WIDTH}px` : `${leftFraction * 100}%`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">AI Design-to-Code</h1>
        </div>
        <div className="text-xs font-mono text-slate-400 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">v1.0.0 Production</div>
      </header>

      <main
        ref={mainRef}
        className="flex-1 flex flex-row p-4 gap-0 max-w-[1800px] mx-auto w-full relative z-10 h-[calc(100vh-80px)]"
        style={{ cursor: isDragging ? 'col-resize' : undefined }}
      >

        {/* ─── Left: Input Config Panel ─── */}
        <div
          className="relative overflow-hidden flex-shrink-0 transition-[width] duration-75 ease-linear"
          style={{ width: leftWidthStyle }}
        >
          {isLeftCollapsed ? (
            <button
              onClick={toggleLeftCollapse}
              className="w-full h-full flex items-center justify-center bg-slate-900/60 hover:bg-slate-800/80 transition-colors rounded-2xl border border-white/10 group"
              title="Expand input panel"
            >
              <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          ) : (
            <section className="h-full flex flex-col bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative transition-all duration-300 hover:border-white/20 mr-0">
              <div className="bg-white/5 border-b border-white/10 px-5 py-4 flex flex-col xl:flex-row justify-between xl:items-center gap-4">

                <div className="flex bg-slate-950/50 rounded-lg p-1 border border-white/5 w-fit">
                  <button
                    onClick={() => setActiveTab('url')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-300 ${activeTab === 'url' ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_1px_rgba(255,255,255,0.1)]' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Figma URL
                  </button>
                  <button
                    onClick={() => setActiveTab('json')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-300 ${activeTab === 'json' ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_1px_rgba(255,255,255,0.1)]' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Raw JSON
                  </button>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Synthesizing...
                    </>
                  ) : (
                    'Generate Component'
                  )}
                </button>
              </div>

              <div className="flex-1 flex flex-col p-6 bg-transparent relative overflow-y-auto">
                {activeTab === 'url' ? (
                  <div className="flex flex-col gap-6 w-full fade-in">
                    <div className="group">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                        <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                        Figma REST URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://www.figma.com/design/..."
                        value={figmaUrl}
                        onChange={(e) => setFigmaUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm text-white placeholder-slate-600 outline-none transition-all shadow-inner"
                      />
                      <p className="mt-2 text-xs text-slate-500 font-medium ml-1">Must contain <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">&node-id=...</code> for optimal compilation.</p>
                    </div>

                    <div className="group">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                        Personal Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="figd_..."
                        value={figmaToken}
                        onChange={handleTokenChange}
                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-sm text-white placeholder-slate-600 outline-none transition-all shadow-inner font-mono tracking-wider"
                      />
                      <p className="mt-2 text-xs text-slate-500 font-medium ml-1">
                        Stored securely offline in local storage.
                      </p>
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="flex-1 w-full h-full text-sm font-mono text-cyan-100 bg-slate-950/50 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 p-5 rounded-xl border border-white/10 placeholder-slate-600 shadow-inner fade-in"
                    placeholder="Paste raw Figma component JSON payload here..."
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  />
                )}
              </div>
            </section>
          )}
        </div>

        {/* ─── Resize Handle ─── */}
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={toggleLeftCollapse}
          className={`w-[6px] mx-1 flex-shrink-0 cursor-col-resize z-20 flex items-center justify-center transition-colors group rounded-full my-4 ${isDragging ? 'bg-cyan-500/40' : 'bg-white/5 hover:bg-cyan-500/20'}`}
          title="Drag to resize · Double-click to collapse"
        >
          <div className={`w-[2px] h-8 rounded-full transition-colors ${isDragging ? 'bg-cyan-400' : 'bg-slate-600 group-hover:bg-cyan-400'}`}></div>
        </div>

        {/* ─── Right: Interactive Playground ─── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden ring-1 ring-white/5 relative z-10">
          {error ? (
            <div className="bg-red-950/50 backdrop-blur-md p-8 w-full h-full flex flex-col justify-center items-center text-center fade-in">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] border border-red-500/30">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-red-100 mb-2 tracking-tight">Compilation Failed</h3>
              <pre className="text-sm text-red-300/80 font-mono whitespace-pre-wrap max-w-lg mx-auto bg-black/40 p-4 rounded-xl border border-red-900/50">{error}</pre>
            </div>
          ) : result?.code ? (
            <div className="w-full h-full flex flex-col fade-in">
              <Playground initialCode={result.code} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 mb-6 relative">
                  <div className="absolute inset-0 border-2 border-dashed border-slate-700 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  <div className="absolute inset-2 border-2 border-slate-600 rounded-full animate-[spin_7s_linear_infinite_reverse]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-300 tracking-tight">Playground Engine Idle</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">Configure an input source and initiate synthesis to launch the dynamic Monaco IDE.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
