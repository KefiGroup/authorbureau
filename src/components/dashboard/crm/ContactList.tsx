import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Mail, Phone, Building2, MessageSquare } from "lucide-react";

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  tags: string[];
}

interface Props {
  contacts: Contact[];
  onDelete: (id: string) => void;
  onSelect: (contact: Contact) => void;
  selectedId?: string;
}

export default function ContactList({ contacts, onDelete, onSelect, selectedId }: Props) {
  if (contacts.length === 0) return null;

  return (
    <div className="space-y-2">
      {contacts.map((c) => (
        <div
          key={c.id}
          onClick={() => onSelect(c)}
          className={`rounded-xl border bg-card p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
            selectedId === c.id ? "border-primary ring-1 ring-primary" : "border-border"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="font-heading font-semibold truncate">{c.full_name}</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </span>
                )}
                {c.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {c.company}
                  </span>
                )}
              </div>
              {c.notes && (
                <p className="mt-1.5 text-xs text-muted-foreground/70 line-clamp-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 shrink-0" /> {c.notes}
                </p>
              )}
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
