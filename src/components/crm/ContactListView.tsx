import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Search, Trash2, ArrowUpDown, Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getSourceLabel } from "@/lib/crm-utils";

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
  crmFetch: (action: string, extra?: Record<string, any>) => Promise<any>;
  onContactClick: (contact: CRMContact) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMoveStage: (ids: string[], stage: string) => void;
  initialStageFilter?: string;
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", engaged: "Engaged", warm: "Warm",
  hot: "Hot", customer: "Customer", vip: "VIP", cold: "Cold",
};

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  new_lead: { bg: "bg-[#3B82F6]", text: "text-white" },
  engaged: { bg: "bg-[#14B8A6]", text: "text-white" },
  warm: { bg: "bg-[#F59E0B]", text: "text-white" },
  hot: { bg: "bg-[#EF4444]", text: "text-white" },
  customer: { bg: "bg-[#10B981]", text: "text-white" },
  vip: { bg: "bg-[#D4AF37]", text: "text-white" },
  cold: { bg: "bg-[#6B7280]", text: "text-white" },
};

const PAGE_SIZE = 25;

export default function ContactListView({ crmFetch, onContactClick, onBulkDelete, onBulkMoveStage, initialStageFilter }: Props) {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState(initialStageFilter || "all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [stageFilter, search]);

  // Apply initial stage filter from pipeline click
  useEffect(() => {
    if (initialStageFilter) setStageFilter(initialStageFilter);
  }, [initialStageFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, pageSize: PAGE_SIZE };
      if (stageFilter !== "all") params.stage = stageFilter;
      if (search) params.search = search;
      const data = await crmFetch("list", params);
      setContacts(data.contacts || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      setContacts([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [crmFetch, page, stageFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 300);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleBulkDelete = async (ids: string[]) => {
    await onBulkDelete(ids);
    setSelected(new Set());
    fetchData();
  };

  const handleBulkMove = async (ids: string[], stage: string) => {
    await onBulkMoveStage(ids, stage);
    setSelected(new Set());
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input defaultValue={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search contacts..." className="pl-9" />
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
        <div className="flex items-center gap-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg px-4 py-2">
          <span className="text-xs font-semibold text-[#1E3A5F]">{selected.size} selected</span>
          <Select onValueChange={(stage) => handleBulkMove(Array.from(selected), stage)}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Move Stage" /></SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleBulkDelete(Array.from(selected))}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F0F4F8]">
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === contacts.length && contacts.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-gray-500 tracking-wide">Name</TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-gray-500 tracking-wide">Email</TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-gray-500 tracking-wide">Stage</TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-gray-500 tracking-wide">Source</TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-gray-500 tracking-wide">Last Activity</TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-gray-500 tracking-wide">
                  <Star className="h-3 w-3 inline mr-1 text-[#D4AF37]" />Score
                </TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-gray-500 tracking-wide">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">No contacts found</TableCell>
                </TableRow>
              ) : (
                contacts.map((c, idx) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer hover:bg-[#FFF8E7] transition-colors ${idx % 2 === 1 ? "bg-gray-50" : "bg-white"}`}
                    onClick={() => onContactClick(c)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                    </TableCell>
                    <TableCell className="font-medium text-[#1E3A5F]">{c.full_name}</TableCell>
                    <TableCell className="text-gray-500 text-xs">{c.email || "—"}</TableCell>
                    <TableCell>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STAGE_COLORS[c.stage]?.bg || "bg-gray-500"} ${STAGE_COLORS[c.stage]?.text || "text-white"}`}>
                        {STAGE_LABELS[c.stage] || c.stage}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{getSourceLabel(c.source)}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-[#D4AF37] fill-[#D4AF37]" />
                        <span className="text-xs font-semibold text-[#1E3A5F]">{c.abby_score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#14B8A6]/15 text-[#14B8A6] font-medium">{t}</span>
                        ))}
                        {c.tags.length > 2 && <span className="text-[9px] text-gray-400">+{c.tags.length - 2}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
