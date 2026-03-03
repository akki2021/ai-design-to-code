import { useState } from 'react';
import { Download, Copy, RefreshCw } from 'lucide-react';

interface ToolbarProps {
    onCopy: () => void;
    onDownload: () => void;
    onReset?: () => void;
}

export function Toolbar({ onCopy, onDownload, onReset }: ToolbarProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-transparent px-5 py-3 flex items-center justify-end gap-3 z-10 w-full">

            {onReset && (
                <button
                    onClick={onReset}
                    className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border border-transparent hover:border-white/10 hover:bg-white/5"
                >
                    <RefreshCw size={16} /> Reset
                </button>
            )}

            <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border border-transparent hover:border-white/10 hover:bg-white/5"
            >
                {copied ? <span className="text-emerald-400 flex items-center gap-1"><Copy size={16} /> Copied!</span> : <><Copy size={16} /> Copy Code</>}
            </button>

            <button
                onClick={onDownload}
                className="bg-cyan-600/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] ml-2"
            >
                <Download size={16} /> Download Source
            </button>
        </div>
    );
}
