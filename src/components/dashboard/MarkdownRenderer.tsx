import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
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
          <h2 className="text-xl font-heading font-semibold text-foreground mt-8 mb-3 pb-1.5 border-b border-border/50">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-heading font-semibold text-foreground mt-6 mb-2">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-heading font-medium text-foreground mt-4 mb-1.5">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="text-sm text-foreground/90 leading-relaxed mb-4">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/80">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-4 space-y-1.5 text-sm text-foreground/90">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-sm text-foreground/90">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-secondary/40 bg-secondary/5 pl-4 py-3 my-4 italic text-sm text-foreground/80 rounded-r-md">
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr className="my-6 border-border" />
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4 rounded-lg border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/60 text-foreground font-medium">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider border-b border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2.5 border-b border-border/50 text-foreground/90">
            {children}
          </td>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
                {children}
              </code>
            );
          }
          return (
            <pre className="bg-muted rounded-lg p-4 my-4 overflow-x-auto">
              <code className="text-xs font-mono text-foreground">{children}</code>
            </pre>
          );
        },
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary underline underline-offset-2 hover:text-secondary/80"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
