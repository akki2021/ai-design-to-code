import React, { useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface PreviewPanelProps {
    transpiledCode: string;
    error: string | null;
}

export function PreviewPanel({ transpiledCode, error }: PreviewPanelProps) {
    const LiveComponent = useMemo(() => {
        if (!transpiledCode || error) return null;

        try {
            // 1. We provide a fake CommonJS environment
            const exports: Record<string, any> = {};
            const module = { exports };

            // 2. We mock require to provide React 
            const requireReact = (moduleName: string) => {
                if (moduleName === 'react') return React;
                throw new Error(`Module not found: ${moduleName}`);
            };

            // 3. We create a function with the CommonJS variables injected
            const execute = new Function('require', 'exports', 'module', 'React', transpiledCode);

            // 4. Execute the code
            execute(requireReact, exports, module, React);

            // 5. The component should be attached to exports.default
            const ResultComponent = exports.default || module.exports.default || module.exports;

            // 6. Return a wrapper that safely invokes it
            return function DynamicComponent() {
                if (typeof ResultComponent === 'function') {
                    return <ResultComponent />;
                }
                return <div className="p-4 text-red-500 text-sm italic">Rendered object is not a valid React component.</div>;
            };
        } catch (err: any) {
            console.error("Evaluation Error", err);
            // We don't throw here to avoid unmounting the whole preview if evaluation fails immediately,
            // instead we return a fallback component that displays the eval error
            return function EvalError() {
                return (
                    <div className="p-4 bg-red-50 text-red-700 text-sm whitespace-pre-wrap font-mono">
                        {err.toString()}
                    </div>
                );
            }
        }
    }, [transpiledCode, error]);

    return (
        <div className="h-full w-full bg-white relative overflow-auto custom-scrollbar">
            {error && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-6 overflow-auto">
                    <div className="bg-red-950/80 border border-red-500/30 p-5 rounded-xl shadow-2xl">
                        <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-lg">
                            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Syntax Error
                        </h3>
                        <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap leading-relaxed">
                            {error}
                        </pre>
                    </div>
                </div>
            )}

            <div className="w-full h-full min-h-[500px]">
                <ErrorBoundary resetKey={transpiledCode}>
                    {LiveComponent ? <LiveComponent /> : (
                        <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">
                            No component code or valid output.
                        </div>
                    )}
                </ErrorBoundary>
            </div>
        </div>
    );
}
