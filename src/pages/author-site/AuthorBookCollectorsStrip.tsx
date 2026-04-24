import type { BookWithProducts, ThemeVars, BookFormatNode } from "./types";
import { getCollectorsEditionsForBook } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import CollectorsEditionCard from "./CollectorsEditionCard";

interface Props {
  book: BookWithProducts;
  authorSlug: string;
  liveNodes: BookFormatNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorBookCollectorsStrip({ book, authorSlug, liveNodes, theme, v }: Props) {
  const editions = getCollectorsEditionsForBook(liveNodes, book);
  if (editions.length === 0) return null;

  return (
    <div
      className="px-6 pb-6 pt-1"
      style={{ borderTop: `1px dashed ${v.cardBorder}` }}
    >
      <div className="flex items-center gap-2 mb-3 mt-3">
        <span className="text-base">✨</span>
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: v.mutedText, fontFamily: theme.headingFont }}
        >
          Collector's Editions
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {editions.map(node => (
          <CollectorsEditionCard
            key={node.id}
            node={node}
            authorSlug={authorSlug}
            theme={theme}
            v={v}
          />
        ))}
      </div>
    </div>
  );
}
