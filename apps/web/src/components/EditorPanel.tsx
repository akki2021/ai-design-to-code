import Editor, { type OnMount } from '@monaco-editor/react';

interface EditorPanelProps {
    code: string;
    onChange: (value: string) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ code, onChange }) => {
    const handleEditorDidMount: OnMount = (_, monaco) => {
        // Configure TypeScript JSX semantics for the editor
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.React,
            jsxFactory: 'React.createElement',
            reactNamespace: 'React',
            allowNonTsExtensions: true,
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
        });
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#1e1e1e]">
            <div className="bg-[#252526] px-4 py-2 flex items-center border-b border-[#3c3c3c]">
                <span className="text-xs text-gray-400 font-mono uppercase font-semibold">GeneratedComponent.tsx</span>
            </div>
            <div className="flex-1 overflow-hidden relative pt-2">
                <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => onChange(val || '')}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        lineNumbersMinChars: 3,
                        folding: true,
                        tabSize: 2,
                        padding: { top: 8 },
                        scrollBeyondLastLine: false,
                    }}
                    onMount={handleEditorDidMount}
                />
            </div>
        </div>
    );
};
