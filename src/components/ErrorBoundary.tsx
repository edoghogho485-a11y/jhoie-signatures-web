import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected rendering issue occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('JHOIE SIGNATURES ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReturnHome = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.hash = '#home';
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#171717] flex items-center justify-center px-4 py-12">
          <div className="max-w-lg w-full bg-white border border-[#171717]/15 p-8 sm:p-10 text-center space-y-6 shadow-sm">
            <div className="space-y-2">
              <p className="font-display text-2xl font-semibold tracking-[0.12em] text-[#171717]">
                JHOIE SIGNATURES
              </p>
              <p className="font-display italic text-base text-[#A68642]">
                Let&apos;s talk fashion....
              </p>
            </div>

            <div className="pt-2 border-t border-[#171717]/10 space-y-2">
              <h1 className="font-display text-3xl font-medium text-[#171717]">
                Something Went Wrong
              </h1>
              <p className="text-sm text-[#171717]/75 leading-relaxed">
                We encountered an unexpected display issue while loading this view. Your shopping
                bag and saved details remain intact.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="w-full sm:w-auto px-6 py-3 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                <span>Return to Homepage</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 border border-[#171717]/20 bg-white text-[#171717] text-xs sm:text-sm font-medium hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
