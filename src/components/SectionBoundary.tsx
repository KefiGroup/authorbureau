import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Friendly section name for log lines, e.g. "AbbyHelpChatbot". */
  name: string;
  children: ReactNode;
  /** Optional fallback. Defaults to `null` so a broken non-essential section just disappears. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for non-essential UI sections (chatbot, dynamic
 * directory strip, etc). Prevents a single component throw from bubbling up
 * to GlobalErrorBoundary and replacing the entire page with the "Something
 * went wrong" fallback.
 *
 * Always logs to console.error so prod stacks remain inspectable.
 */
export class SectionBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(
      `[SectionBoundary:${this.props.name}]`,
      error?.message || error,
      info?.componentStack
    );
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export default SectionBoundary;
