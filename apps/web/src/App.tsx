import { useState, useEffect, useCallback, useRef } from 'react';
import { Playground } from './Playground';

const API_BASE = 'http://localhost:4000';
const MIN_LEFT_WIDTH = 80;
const COLLAPSED_WIDTH = 36;

interface AuthUser {
  name: string;
  img: string | null;
}

function App() {
  // ─── Auth state ───
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // ─── App state ───
  const [figmaUrl, setFigmaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tree?: any; code?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Resize state ───
  const mainRef = useRef<HTMLDivElement>(null);
  const [leftFraction, setLeftFraction] = useState(0.3);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  // ─── Check auth on mount ───
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .catch(() => { })
      .finally(() => setAuthChecking(false));

    // Check for auth errors in URL params
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      setError(`Authentication failed: ${authError.replace(/_/g, ' ')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSignIn = () => {
    window.location.href = `${API_BASE}/auth/figma`;
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    setResult(null);
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!figmaUrl) {
        throw new Error('Please provide a Figma URL.');
      }

      const response = await fetch(`${API_BASE}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ figmaUrl }),
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
      if (x < MIN_LEFT_WIDTH) {
        setIsLeftCollapsed(true);
        setLeftFraction(COLLAPSED_WIDTH / rect.width);
      } else {
        setIsLeftCollapsed(false);
        setLeftFraction(Math.min(Math.max(x / rect.width, 0.15), 0.55));
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
    if (isLeftCollapsed) { setIsLeftCollapsed(false); setLeftFraction(0.3); }
    else { setIsLeftCollapsed(true); setLeftFraction(0); }
  };

  const isGenerateDisabled = loading || !figmaUrl;
  const leftWidthStyle = isLeftCollapsed ? `${COLLAPSED_WIDTH}px` : `${leftFraction * 100}%`;

  // ─── Loading screen ───
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-400 text-sm font-medium">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // ─── Sign-in screen ───
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.4)] mb-8">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>

          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-3 tracking-tight">AI Design-to-Code</h1>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed">
            Transform your Figma designs into production-ready React + Tailwind components instantly. Sign in with your Figma account to get started.
          </p>

          <button
            onClick={handleSignIn}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 px-8 py-3.5 rounded-xl text-white font-semibold transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] group"
          >
            <svg className="w-5 h-5" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE" />
              <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83" />
              <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262" />
              <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E" />
              <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF" />
            </svg>
            <span className="group-hover:translate-x-0.5 transition-transform">Sign in with Figma</span>
          </button>

          {error && (
            <div className="mt-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main authenticated app ───
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">AI Design-to-Code</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            {user.img ? (
              <img src={user.img} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500"></div>
            )}
            <span className="text-sm text-slate-300 font-medium">{user.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors font-medium px-2 py-1"
          >
            Sign out
          </button>
        </div>
      </header>

      <main
        ref={mainRef}
        className="flex-1 flex flex-row p-4 gap-0 max-w-[1800px] mx-auto w-full relative z-10 h-[calc(100vh-80px)]"
        style={{ cursor: isDragging ? 'col-resize' : undefined }}
      >
        {/* ─── Left: URL Input Panel ─── */}
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
            <section className="h-full flex flex-col bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative transition-all duration-300 hover:border-white/20">
              <div className="bg-white/5 border-b border-white/10 px-5 py-4 flex justify-between items-center gap-4">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-500" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE" />
                    <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83" />
                    <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262" />
                    <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E" />
                    <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF" />
                  </svg>
                  Figma Source
                </h2>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
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
                    'Generate'
                  )}
                </button>
              </div>

              <div className="flex-1 flex flex-col p-6 bg-transparent relative overflow-y-auto">
                <div className="flex flex-col gap-5 w-full fade-in">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                      <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                      Figma Component URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://www.figma.com/design/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isGenerateDisabled) handleGenerate(); }}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm text-white placeholder-slate-600 outline-none transition-all shadow-inner"
                    />
                    <p className="mt-2 text-xs text-slate-500 font-medium ml-1">
                      Include <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">&node-id=...</code> to target a specific component.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    Authenticated via Figma OAuth — your files are accessed securely
                  </div>
                </div>
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
              <h3 className="text-xl font-bold text-red-100 mb-2 tracking-tight">Error</h3>
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
                <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">Paste a Figma URL and click Generate to launch the interactive Monaco IDE.</p>
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
