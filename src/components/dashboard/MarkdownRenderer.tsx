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
        // ... keep existing code (h2 through code components)
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
      {content}
    </ReactMarkdown>
  );
}
