import { BookOpen, Check, ChevronDown, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { MyBook } from "@/hooks/useMyBooks";

interface Props {
  books: MyBook[];
  activeBookId: string | null;
  onChange: (bookId: string | null) => void;
}

/**
 * "Source Book" pill for the Marketing Hub.
 *
 * Mirrors the dark-navy context bar used by PodcastStudio / SocialMediaStudio,
 * but with a dropdown so the author can switch books or view "All Books".
 * Only renders when the author has 2+ books.
 */
export default function MarketingHubBookSelector({ books, activeBookId, onChange }: Props) {
  if (books.length <= 1) return null;

  const active = activeBookId ? books.find((b) => b.id === activeBookId) ?? null : null;
  const label = active ? active.title : `All of your books`;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border border-border/50">
      {active?.cover_image_url ? (
        <img src={active.cover_image_url} alt="" className="w-8 h-10 rounded object-cover" />
      ) : (
        <div className="w-8 h-10 rounded bg-muted flex items-center justify-center">
          {active ? <BookOpen className="h-4 w-4 text-muted-foreground" /> : <Library className="h-4 w-4 text-muted-foreground" />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Marketing scope
        </p>
        <p className="text-sm font-medium truncate">{label}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Switch book <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Marketing Hub scope
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onChange(null)} className="gap-2">
            <Library className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">All of your books</span>
            {activeBookId === null && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {books.map((b) => (
            <DropdownMenuItem key={b.id} onClick={() => onChange(b.id)} className="gap-2">
              {b.cover_image_url ? (
                <img src={b.cover_image_url} alt="" className="w-5 h-7 rounded object-cover shrink-0" />
              ) : (
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 truncate">{b.title}</span>
              {activeBookId === b.id && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Badge variant="outline" className="ml-1 text-[10px] hidden sm:inline-flex">
        {active ? "Single book" : `${books.length} books`}
      </Badge>
    </div>
  );
}
