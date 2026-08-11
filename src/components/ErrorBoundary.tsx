import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches render crashes and shows a visible message instead of a silent blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-premium p-6 space-y-4 text-center">
          <span className="text-4xl block">⚠️</span>
          <h2 className="text-lg font-display font-semibold text-foreground">
            Something went wrong on this screen
          </h2>
          <p className="text-sm text-muted-foreground break-words">
            {this.state.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
