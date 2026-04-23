import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  onReset: () => void;
  children: React.ReactNode;
}
interface State { hasError: boolean; message?: string; }

export class YRSafeBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("YRSafeBoundary caught:", error, info);
  }
  reset = () => {
    this.setState({ hasError: false, message: undefined });
    this.props.onReset();
  };
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 space-y-3 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="font-bold text-lg">This view couldn't render</h3>
            <p className="text-sm text-muted-foreground">
              Abby returned content in an unexpected shape. Click below to re-generate.
            </p>
            {this.state.message && (
              <p className="text-xs text-muted-foreground font-mono">{this.state.message}</p>
            )}
            <Button onClick={this.reset}>Re-generate</Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

/** Render a value that may be a string OR string[] (from drifting AI shapes). */
export function SafeText({ value, className }: { value: any; className?: string }) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return (
      <ul className={`space-y-1 ${className ?? ""}`}>
        {value.map((v, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-primary">•</span>
            <span>{typeof v === "string" ? v : JSON.stringify(v)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return <p className={`text-sm ${className ?? ""}`}>{JSON.stringify(value)}</p>;
  }
  return <p className={`text-sm ${className ?? ""}`}>{String(value)}</p>;
}
