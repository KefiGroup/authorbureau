import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import type { Book } from "@/data/authors";

import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import hiCover from "@/assets/hemispheric-intelligence-cover.png";
import viCover from "@/assets/value-investing-women-cover.png";
import ilbCover from "@/assets/invest-like-buffett-cover.jpg";
import tobabywithlove from "@/assets/to-baby-with-love-cover.png";
import lostandfound from "@/assets/lost-and-found-cover.png";
import giftfromheaven from "@/assets/gift-from-heaven-cover.png";

const coverMap: Record<string, string> = {
  "be-suckcessful": besuckcessfulCover,
  "hemispheric-intelligence": hiCover,
  "value-investing-for-women": viCover,
  "invest-like-buffett": ilbCover,
  "invest-like-buffett-value-investing-for-parents": ilbCover,
  "to-baby-with-love": tobabywithlove,
  "lost-and-found": lostandfound,
  "a-gift-from-heaven": giftfromheaven,
};

interface BookCardProps {
  book: Book & { cover_image_url?: string | null };
  showAuthor?: boolean;
  authorName?: string;
}

export default function BookCard({ book, showAuthor = false, authorName }: BookCardProps) {
  return (
    <Link to={`/books/${book.slug}`}>
      <Card className="group overflow-hidden border-0 bg-card rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-pointer h-full">
        <CardContent className="p-0">
          {/* Book Cover */}
          <div className="relative aspect-[2/3] bg-muted/50 overflow-hidden">
            {(coverMap[book.slug] || book.coverImage || book.cover_image_url) ? (
              <img
                src={coverMap[book.slug] || book.coverImage || book.cover_image_url!}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-primary">
                <span className="text-primary-foreground/60 text-xs uppercase tracking-wider mb-2">Book</span>
                <span className="text-primary-foreground text-center font-heading font-semibold text-sm leading-snug">
                  {book.title}
                </span>
              </div>
            )}
            {book.badges.length > 0 && (
              <div className="absolute top-2 left-2 bg-secondary text-secondary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                {book.badges[0]}
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-heading text-base font-semibold group-hover:text-secondary transition-colors line-clamp-2">
              {book.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">{book.subtitle}</p>
            {showAuthor && authorName && (
              <p className="text-xs text-muted-foreground mt-1.5">by {authorName}</p>
            )}
            {(book.kindlePrice || book.paperbackPrice || book.price) && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {book.kindlePrice && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-secondary" />
                    <span className="font-semibold text-foreground">{book.kindlePrice}</span>
                    <span>Kindle</span>
                  </div>
                )}
                {book.paperbackPrice && (
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">{book.paperbackPrice}</span>
                    <span>Paperback</span>
                  </div>
                )}
                {!book.kindlePrice && !book.paperbackPrice && book.price && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-secondary" />
                    <span className="font-semibold text-foreground">{book.price}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
