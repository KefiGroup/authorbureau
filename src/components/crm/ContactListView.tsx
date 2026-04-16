import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Search, Trash2, ArrowUpDown, Tag, Star } from "lucide-react";

interface CRMContact {
  id: string;
  full_name: string;
  email: string | null;
  stage: string;
  abby_score: number;
  source: string;
  last_activity_at: string | null;
  tags: string[];
}

interface Props {
  contacts: CRMContact[];
  onContactClick: (contact: CRMContact) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMoveStage: (ids: string[], stage: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", engaged: "Engaged", warm: "Warm",
  hot: "Hot", customer: "Customer", vip: "VIP", cold: "Cold",
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-500/20 text-blue-400", engaged: "bg-teal-500/20 text-teal-400",
  warm: "bg-amber-500/20 text-amber-400", hot: "bg-orange-500/20 text-orange-400",
  customer: "bg-green-500/20 text-green-400", vip: "bg-yellow-500/20 text-yellow-400",
  cold: "bg-gray-500/20 text-gray-400",
};

type SortKey = "full_name" | "stage" | "abby_score" | "last_activity_at";

export default function ContactListView({ contacts, onContactClick, onBulkDelete, onBulkMoveStage }: Props) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("abby_score");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = contacts;
    if (stageFilter !== "all") list = list.filter((c) => c.stage === stageFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.full_name.toLowerCase().includes(q) || (c.email?.toLowerCase().includes(q) ?? false)
      );
    }
    list = [...list].sort((a, b) => {
      let va: any = (a as any)[sortKey];
      let vb: any = (b as any)[sortKey];
      if (sortKey === "last_activity_at") { va = va ? new Date(va).getTime() : 0; vb = vb ? new Date(vb).getTime() : 0; }
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [contacts, stageFilter, search, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." className="pl-9" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <Select onValueChange={(stage) => { onBulkMoveStage(Array.from(selected), stage); setSelected(new Set()); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Move Stage" /></SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => { onBulkDelete(Array.from(selected)); setSelected(new Set()); }}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("full_name")}>
                Name <ArrowUpDown className="h-3 w-3 inline ml-1" />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("stage")}>
                Stage <ArrowUpDown className="h-3 w-3 inline ml-1" />
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("last_activity_at")}>
                Last Activity <ArrowUpDown className="h-3 w-3 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("abby_score")}>
                <Star className="h-3 w-3 inline mr-1" />Score <ArrowUpDown className="h-3 w-3 inline ml-1" />
              </TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No contacts found</TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onContactClick(c)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.email || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${STAGE_COLORS[c.stage] || ""}`}>
                      {STAGE_LABELS[c.stage] || c.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.source?.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-semibold">{c.abby_score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>
                      ))}
                      {c.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{c.tags.length - 2}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
