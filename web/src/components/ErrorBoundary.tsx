// web/src/components/ErrorBoundary.tsx
import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Algo deu errado
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Ocorreu um erro inesperado. Tente recarregar a pagina ou voltar ao inicio.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-slate-100 dark:bg-slate-900 rounded-lg p-3 text-xs">
                <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-400">
                  Detalhes do erro (dev)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-red-600 dark:text-red-400 overflow-auto max-h-40">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
              >
                Recarregar
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Voltar ao inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
