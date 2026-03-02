import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Users, Mail, BookOpen, UserPlus } from "lucide-react";

interface UnifiedContact {
  id: string;
  name: string;
  email: string;
  source: "member" | "reading_club" | "newsletter";
  sourceDetail?: string; // e.g. book title for newsletter
  joinedAt: string;
}

const sourceConfig: Record<string, { label: string; icon: typeof Users; color: string }> = {
  member: { label: "Member", icon: UserPlus, color: "bg-primary/10 text-primary border-primary/20" },
  reading_club: { label: "Reading Club", icon: BookOpen, color: "bg-green-500/10 text-green-700 border-green-500/20" },
  newsletter: { label: "Newsletter", icon: Mail, color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
};

export default function CRMDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, readingRes, newsletterRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, created_at"),
        supabase.from("reading_club_members").select("id, email, display_name, joined_at, status"),
        supabase.from("newsletter_signups").select("id, email, created_at, book_id, books(title)"),
      ]);

      const unified: UnifiedContact[] = [];

      // 1. Registered members (profiles) — we don't have email in profiles,
      //    but display_name is available
      (profilesRes.data || []).forEach((p: any) => {
        unified.push({
          id: `member-${p.user_id}`,
          name: p.display_name || "Unknown",
          email: p.display_name?.includes("@") ? p.display_name : "",
          source: "member",
          joinedAt: p.created_at,
        });
      });

      // 2. Reading club members
      (readingRes.data || []).forEach((r: any) => {
        unified.push({
          id: `rc-${r.id}`,
          name: r.display_name || r.email,
          email: r.email,
          source: "reading_club",
          joinedAt: r.joined_at,
        });
      });

      // 3. Newsletter subscribers
      (newsletterRes.data || []).forEach((n: any) => {
        unified.push({
          id: `nl-${n.id}`,
          name: n.email,
          email: n.email,
          source: "newsletter",
          sourceDetail: n.books?.title || undefined,
          joinedAt: n.created_at,
        });
      });

      // Deduplicate by email (keep earliest, merge sources)
      const emailMap = new Map<string, UnifiedContact & { sources: Set<string> }>();
      unified.forEach((c) => {
        const key = c.email?.toLowerCase() || c.id;
        if (emailMap.has(key)) {
          const existing = emailMap.get(key)!;
          existing.sources.add(c.source);
          if (c.sourceDetail) existing.sourceDetail = c.sourceDetail;
          if (c.name && c.name !== c.email && (!existing.name || existing.name === existing.email)) {
            existing.name = c.name;
          }
        } else {
          emailMap.set(key, { ...c, sources: new Set([c.source]) });
        }
      });

      setContacts(
        Array.from(emailMap.values())
          .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
          .map((c) => ({ ...c, source: c.source })) // keep primary source
      );
    } catch (err: any) {
      toast({ title: "Failed to load contacts", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contacts.length, member: 0, reading_club: 0, newsletter: 0 };
    contacts.forEach((c) => {
      counts[c.source] = (counts[c.source] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (sourceFilter !== "all") {
      list = list.filter((c) => c.source === sourceFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.sourceDetail?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [contacts, sourceFilter, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">Contacts & CRM</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Everyone who signed up — members, reading club, and newsletter subscribers.
        </p>
      </div>

      {/* Source filter pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All Contacts" },
          { key: "member", label: "Members" },
          { key: "reading_club", label: "Reading Club" },
          { key: "newsletter", label: "Newsletter" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setSourceFilter(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              sourceFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {f.label}
            <span className="text-xs opacity-70">({sourceCounts[f.key] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      {contacts.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or book..."
            className="pl-9"
          />
        </div>
      )}

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">
            {search ? "No matches" : "No contacts yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search
              ? `No contacts match "${search}"`
              : "Contacts will appear here as people sign up, join the reading club, or subscribe to newsletters."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Name / Email</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Source</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Detail</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const cfg = sourceConfig[c.source];
                  const Icon = cfg.icon;
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[220px]">
                          {c.name !== c.email ? c.name : "—"}
                        </div>
                        {c.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">{c.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[180px]">
                        {c.sourceDetail || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(c.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
