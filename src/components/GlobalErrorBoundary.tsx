import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toAbbyError } from "@/lib/abby-error";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-wide error boundary. Wraps every route so a render-time crash never
 * shows the blank white screen. Renders a friendly ABBY-voiced fallback
 * with "Try again" + "Go home" actions.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for devtools; future: forward to telemetry.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("[GlobalErrorBoundary]", error, info.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const friendly = toAbbyError(this.state.error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {friendly}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" onClick={this.handleHome} className="gap-2">
              <Home className="h-4 w-4" />
              Go home
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="text-left text-xs text-muted-foreground/70 mt-4 border-t border-border pt-3">
              <summary className="cursor-pointer">Developer details</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default GlobalErrorBoundary;
