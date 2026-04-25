import { Component, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Defensive error boundary for YR-* (Yield Revenue) builders.
 * Catches render errors thrown by AI-generated content and offers a reset.
 */
interface BoundaryProps {
  nodeId: string;
  children: ReactNode;
  onReset?: () => void;
  debugContent?: unknown;
}

interface BoundaryState {
  hasError: boolean;
  error?: Error;
}

export class YRSafeBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(`[YRSafeBoundary:${this.props.nodeId}]`, error, info, this.props.debugContent);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="font-semibold">Something went wrong rendering {this.props.nodeId}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Reset and try again
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children as JSX.Element;
  }
}

/**
 * Renders any value safely as text. Coerces objects/arrays to JSON.
 * Use for AI-generated fields where the shape is not guaranteed.
 */
export function SafeText({ value, className }: { value: unknown; className?: string }) {
  if (value == null) return null;
  let text: string;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    text = String(value);
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      return null;
    }
  }
  if (className) return <span className={className}>{text}</span>;
  return <>{text}</>;
}

/**
 * Renders any value as a block with safe coercion.
 * Arrays render as a bulleted list; objects render as labeled key/value rows.
 */
export function SafeBlock({ value, className }: { value: unknown; className?: string }) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return (
      <ul className={`list-disc pl-5 space-y-1 ${className ?? ""}`}>
        {value.map((item, i) => (
          <li key={i}>
            <SafeText value={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className={`space-y-1 ${className ?? ""}`}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="text-sm">
            <span className="font-semibold capitalize">{k.replace(/_/g, " ")}: </span>
            <SafeText value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <SafeText value={value} className={className} />;
}
