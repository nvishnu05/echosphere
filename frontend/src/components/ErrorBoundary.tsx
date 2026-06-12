import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    localStorage.clear(); // Clear local storage to fix any corrupted session state
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#08070b] bg-gradient-premium px-4 relative overflow-hidden text-zinc-100">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[100px]" />
          
          <div className="w-full max-w-lg bg-glass border border-red-500/15 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative z-10 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle size={28} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Application Error</h1>
              <p className="text-xs text-zinc-400">
                A runtime crash occurred in the interface. Please share the details below.
              </p>
            </div>

            <div className="p-4 bg-zinc-950/60 border border-white/5 rounded-2xl text-left overflow-x-auto text-[11px] font-mono text-red-300 leading-normal max-h-40 scrollbar-thin">
              <span className="font-semibold text-white block mb-1">
                {this.state.error?.toString() || 'Unknown Error'}
              </span>
              <pre className="whitespace-pre-wrap opacity-80">
                {this.state.errorInfo?.componentStack || this.state.error?.stack || 'No stack trace available.'}
              </pre>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 text-xs font-semibold rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} />
              Reset App & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
