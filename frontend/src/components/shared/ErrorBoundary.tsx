import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackMessage } = this.props;
      const errorMessage = this.state.error?.message ?? "An unexpected error occurred.";
      const displayMessage = fallbackMessage ?? errorMessage;
      const truncated =
        displayMessage.length > 200 ? displayMessage.slice(0, 200) + "…" : displayMessage;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              {/* Inline alert SVG — no lucide import needed */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>

              <div className="flex-1 space-y-3">
                <h2 className="text-base font-semibold text-red-700 dark:text-red-300">
                  Something went wrong
                </h2>

                <code className="block whitespace-pre-wrap break-all rounded-md border border-red-200 bg-white px-3 py-2 text-xs text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
                  {truncated}
                </code>

                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:border-red-600 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 dark:focus:ring-offset-red-950"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackMessage?: string
) {
  return function Wrapped(props: P) {
    return (
      <ErrorBoundary fallbackMessage={fallbackMessage}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
