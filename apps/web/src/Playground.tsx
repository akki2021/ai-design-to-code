import { useState, useEffect, useCallback, useRef } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { Toolbar } from './components/Toolbar';
import { transpileCode } from './utils/transpile';

interface PlaygroundProps {
    initialCode?: string;
}

const MIN_EDITOR_WIDTH = 80;   // px – below this, collapse
const COLLAPSED_WIDTH = 36;    // px – thin bar when collapsed

export function Playground({ initialCode = '' }: PlaygroundProps) {
    const [editorCode, setEditorCode] = useState(initialCode);
    const [transpiledCode, setTranspiledCode] = useState('');
    const [syntaxError, setSyntaxError] = useState<string | null>(null);

    // Resize state
    const containerRef = useRef<HTMLDivElement>(null);
    const [editorFraction, setEditorFraction] = useState(0.45); // 45% default
    const [isDragging, setIsDragging] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (initialCode) {
            setEditorCode(initialCode);
        } else {
            const saved = localStorage.getItem('figma_playground_code');
            if (saved) setEditorCode(saved);
        }
    }, [initialCode]);

    // Debounced transpilation
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            try {
                setSyntaxError(null);
                if (editorCode.trim() === '') {
                    setTranspiledCode('');
                    return;
                }
                localStorage.setItem('figma_playground_code', editorCode);
                const cleanedCode = editorCode.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
                const runnable = transpileCode(cleanedCode);
                setTranspiledCode(runnable);
            } catch (err: any) {
                setSyntaxError(err.message);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [editorCode]);

    // ─── Drag resize logic ───
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const fraction = x / rect.width;

            if (x < MIN_EDITOR_WIDTH) {
                setIsCollapsed(true);
                setEditorFraction(COLLAPSED_WIDTH / rect.width);
            } else {
                setIsCollapsed(false);
                setEditorFraction(Math.min(Math.max(fraction, 0.15), 0.85));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const toggleCollapse = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setEditorFraction(0.45);
        } else {
            setIsCollapsed(true);
            setEditorFraction(0);
        }
    };

    // ─── Action handlers ───
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(editorCode);
    }, [editorCode]);

    const handleDownload = useCallback(() => {
        const blob = new Blob([editorCode], { type: 'text/typescript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'GeneratedComponent.tsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [editorCode]);

    const handleReset = useCallback(() => {
        if (confirm('Are you sure you want to reset to the generated code?')) {
            setEditorCode(initialCode);
        }
    }, [initialCode]);

    const editorWidthStyle = isCollapsed ? `${COLLAPSED_WIDTH}px` : `${editorFraction * 100}%`;

    return (
        <div className="flex flex-col h-full bg-slate-950/40 w-full overflow-hidden">
            <Toolbar
                onCopy={handleCopy}
                onDownload={handleDownload}
                onReset={initialCode ? handleReset : undefined}
            />

            <div
                ref={containerRef}
                className="flex-1 flex flex-row overflow-hidden border-t border-white/10 relative"
                style={{ cursor: isDragging ? 'col-resize' : undefined }}
            >
                {/* Editor Panel */}
                <div
                    className="relative overflow-hidden transition-[width] duration-75 ease-linear flex-shrink-0"
                    style={{ width: editorWidthStyle }}
                >
                    {isCollapsed ? (
                        <button
                            onClick={toggleCollapse}
                            className="w-full h-full flex items-center justify-center bg-slate-900/80 hover:bg-slate-800/80 transition-colors group"
                            title="Expand editor"
                        >
                            <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    ) : (
                        <EditorPanel code={editorCode} onChange={setEditorCode} />
                    )}
                </div>

                {/* Resize Handle */}
                <div
                    onMouseDown={handleMouseDown}
                    onDoubleClick={toggleCollapse}
                    className={`w-[6px] flex-shrink-0 cursor-col-resize z-20 flex items-center justify-center transition-colors group ${isDragging ? 'bg-cyan-500/40' : 'bg-white/5 hover:bg-cyan-500/20'}`}
                    title="Drag to resize · Double-click to collapse"
                >
                    <div className={`w-[2px] h-8 rounded-full transition-colors ${isDragging ? 'bg-cyan-400' : 'bg-slate-600 group-hover:bg-cyan-400'}`}></div>
                </div>

                {/* Live Preview Panel */}
                <div className="flex-1 relative bg-transparent min-w-0">
                    <div className="absolute top-0 left-0 w-full bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider z-10 flex justify-between items-center shadow-md">
                        <span>Live Output</span>
                        {syntaxError === null && transpiledCode ? (
                            <span className="flex items-center text-emerald-400 gap-1.5 normal-case font-medium">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div> Linked
                            </span>
                        ) : syntaxError ? (
                            <span className="flex items-center text-rose-400 gap-1.5 normal-case font-medium">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div> Crash
                            </span>
                        ) : null}
                    </div>
                    <div className="w-full h-full pt-[33px] bg-white/5 relative z-0">
                        <PreviewPanel transpiledCode={transpiledCode} error={syntaxError} />
                    </div>
                </div>
            </div>
        </div>
    );
}
