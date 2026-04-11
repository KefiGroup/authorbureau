import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const navigate = useNavigate();

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-heading font-bold text-foreground mt-8 mb-4 first:mt-0 pb-2 border-b border-border">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-heading font-bold text-foreground mt-7 mb-3 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-heading font-semibold text-foreground mt-5 mb-2 first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-heading font-semibold text-foreground mt-4 mb-2 first:mt-0">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="text-[14px] leading-[1.75] text-foreground mb-5 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside pl-5 text-sm space-y-1.5 mb-4 last:mb-0 text-foreground">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside pl-5 text-sm space-y-1.5 mb-4 last:mb-0 text-foreground">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-secondary/40 pl-4 italic text-muted-foreground my-4">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/90">{children}</em>
        ),
        hr: () => <hr className="my-6 border-border" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-4 rounded-lg border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50 border-b border-border">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-foreground text-xs uppercase tracking-wide">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-foreground border-t border-border/50">
            {children}
          </td>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
                {children}
              </code>
            );
          }
          return (
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto my-4 text-xs">
              <code className={`font-mono ${className || ""}`} {...props}>
                {children}
              </code>
            </pre>
          );
        },
        a: ({ href, children }) => {
          const isInternal = href?.startsWith("/");
          if (isInternal) {
            return (
              <a
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(href!);
                }}
                className="text-secondary underline underline-offset-2 hover:text-secondary/80 cursor-pointer"
              >
                {children}
              </a>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary underline underline-offset-2 hover:text-secondary/80"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content.replace(/^[—–]\s+/gm, "- ")}
    </ReactMarkdown>
  );
}