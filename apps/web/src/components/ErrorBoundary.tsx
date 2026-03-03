import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children?: ReactNode;
    resetKey?: any; // To forcefully reset the error boundary if the code changes
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Preview Runtime Error:', error, errorInfo);
    }

    public componentDidUpdate(prevProps: Props) {
        if (this.props.resetKey !== prevProps.resetKey) {
            this.setState({ hasError: false, error: null });
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-6 h-full text-center bg-red-50/50">
                    <div className="bg-red-100/80 border border-red-200 p-4 rounded-lg shadow-sm text-left w-full max-w-lg">
                        <h3 className="text-red-700 font-bold mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Runtime Error
                        </h3>
                        <pre className="text-sm text-red-600 overflow-auto max-h-48 whitespace-pre-wrap font-mono relative">
                            {this.state.error?.toString()}
                        </pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
