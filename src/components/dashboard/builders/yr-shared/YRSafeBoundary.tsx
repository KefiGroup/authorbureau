import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  onReset: () => void;
  children: React.ReactNode;
  nodeId?: string;
  debugContent?: any;
}
interface State { hasError: boolean; message?: string; showRaw?: boolean; }

export class YRSafeBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showRaw: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const tag = this.props.nodeId ? `[${this.props.nodeId}] ` : "";
    console.error(`${tag}YRSafeBoundary caught:`, error, info, "content:", this.props.debugContent);
  }
  reset = () => {
    this.setState({ hasError: false, message: undefined, showRaw: false });
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
              {this.props.nodeId ? `${this.props.nodeId}: ` : ""}Abby returned content in an unexpected shape. Click below to re-generate.
            </p>
            {this.state.message && (
              <p className="text-xs text-muted-foreground font-mono break-all">{this.state.message}</p>
            )}
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={this.reset}>Re-generate</Button>
              {this.props.debugContent != null && (
                <Button variant="outline" onClick={() => this.setState(s => ({ showRaw: !s.showRaw }))}>
                  {this.state.showRaw ? <><ChevronUp className="h-4 w-4 mr-1" /> Hide raw content</> : <><ChevronDown className="h-4 w-4 mr-1" /> Show raw content</>}
                </Button>
              )}
            </div>
            {this.state.showRaw && this.props.debugContent != null && (
              <pre className="text-left text-[10px] font-mono bg-muted/50 p-3 rounded max-h-80 overflow-auto whitespace-pre-wrap break-all">
                {(() => { try { return JSON.stringify(this.props.debugContent, null, 2); } catch { return String(this.props.debugContent); } })()}
              </pre>
            )}
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

function stringifyValue(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

/**
 * Inline-safe text renderer. Renders a <span> for primitives and a <span>-wrapped
 * stringification for objects. For arrays, renders a small inline list of bullets
 * inside a <span> using flex so it stays valid in any parent (inline or block).
 *
 * Use <SafeBlock> when you explicitly want a block-level <ul>/<div> layout.
 */
export function SafeText({ value, className }: { value: any; className?: string }) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    // Inline-safe list: span containing comma-separated items, or stacked spans via <br/>
    return (
      <span className={`text-sm ${className ?? ""}`}>
        {value.map((v, i) => (
          <span key={i} className="block">
            <span className="text-primary mr-1">•</span>
            <span>{stringifyValue(v)}</span>
          </span>
        ))}
      </span>
    );
  }
  if (typeof value === "object") {
    return <span className={`text-sm ${className ?? ""}`}>{stringifyValue(value)}</span>;
  }
  return <span className={`text-sm ${className ?? ""}`}>{String(value)}</span>;
}

/**
 * Block-level safe renderer. Always renders a <div> wrapper so it's safe to use
 * inside any block context. Arrays become bulleted lists; objects/strings become paragraphs.
 */
export function SafeBlock({ value, className }: { value: any; className?: string }) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return (
      <ul className={`space-y-1 ${className ?? ""}`}>
        {value.map((v, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-primary">•</span>
            <span>{stringifyValue(v)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return <div className={`text-sm ${className ?? ""}`}>{stringifyValue(value)}</div>;
  }
  return <div className={`text-sm ${className ?? ""}`}>{String(value)}</div>;
}
