import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, BookOpen, Globe, ImageIcon, Search, Upload, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { adminDataFetch } from "@/lib/admin-data-fetch";

interface DirectoryAuthor {
  user_id: string;
  pen_name: string | null;
  photo_url: string | null;
  photo_crop_y: string | null;
  bio_short: string | null;
  bio_long: string | null;
  tagline: string | null;
  genres: string[] | null;
  directory_status: string;
  author_slug: string | null;
  created_at: string;
  book_count?: number;
  website_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  location_city: string | null;
  location_country: string | null;
}

const ALL_STATUSES = ["unlisted", "listed", "verified", "featured"] as const;

const statusColors: Record<string, string> = {
  unlisted: "bg-muted text-muted-foreground",
  listed: "bg-blue-100 text-blue-800",
  verified: "bg-green-100 text-green-800",
  featured: "bg-amber-100 text-amber-800",
};


export default function AuthorsTab() {
  const [authors, setAuthors] = useState<DirectoryAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cropEditing, setCropEditing] = useState<string | null>(null);
  const [cropValue, setCropValue] = useState<number>(0);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<DirectoryAuthor | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingAuthor, setDeletingAuthor] = useState<DirectoryAuthor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchAuthors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDataFetch("list-authors");
      setAuthors(data.authors || []);
    } catch (error) {
      toast({ title: "Failed to load authors", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchAuthors(); }, [fetchAuthors]);

  const updateStatus = async (userId: string, newStatus: string) => {
    setUpdatingId(userId);
    try {
      await adminDataFetch("update-author", { userId, updates: { directory_status: newStatus } });
      setAuthors((prev) =>
        prev.map((a) => (a.user_id === userId ? { ...a, directory_status: newStatus } : a))
      );
      toast({ title: `Author status changed to "${newStatus}"` });
    } catch (err) {
      toast({ title: err.message || "Update failed", variant: "destructive" });
    }
    setUpdatingId(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPhotoFor) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `admin-uploads/${uploadingPhotoFor}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("author-photos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("author-photos").getPublicUrl(path);
      await adminDataFetch("update-author", { userId: uploadingPhotoFor, updates: { photo_url: publicUrl } });
      setAuthors((prev) =>
        prev.map((a) => (a.user_id === uploadingPhotoFor ? { ...a, photo_url: publicUrl } : a))
      );
      toast({ title: "Photo updated successfully" });
    } catch (err) {
      toast({ title: err.message || "Upload failed", variant: "destructive" });
    }
    setUploading(false);
    setUploadingPhotoFor(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEditDialog = (author: DirectoryAuthor) => {
    setEditingAuthor(author);
    setEditForm({
      pen_name: author.pen_name || "",
      tagline: author.tagline || "",
      bio_short: author.bio_short || "",
      bio_long: author.bio_long || "",
      website_url: author.website_url || "",
      instagram_url: author.instagram_url || "",
      twitter_url: author.twitter_url || "",
      linkedin_url: author.linkedin_url || "",
      youtube_url: author.youtube_url || "",
      location_city: author.location_city || "",
      location_country: author.location_country || "",
    });
  };

  const saveEditForm = async () => {
    if (!editingAuthor) return;
    setEditSaving(true);
    try {
      await adminDataFetch("update-author", { userId: editingAuthor.user_id, updates: editForm });
      setAuthors((prev) =>
        prev.map((a) => (a.user_id === editingAuthor.user_id ? { ...a, ...editForm } : a))
      );
      toast({ title: "Profile updated" });
      setEditingAuthor(null);
    } catch (err) {
      toast({ title: err.message || "Update failed", variant: "destructive" });
    }
    setEditSaving(false);
  };

  const deleteAuthor = async () => {
    if (!deletingAuthor) return;
    setDeleting(true);
    try {
      await adminDataFetch("delete-author", { userId: deletingAuthor.user_id });
      setAuthors((prev) => prev.filter((a) => a.user_id !== deletingAuthor.user_id));
      toast({ title: `Author "${deletingAuthor.pen_name || 'Unnamed'}" deleted` });
      setDeletingAuthor(null);
    } catch (err) {
      toast({ title: err.message || "Delete failed", variant: "destructive" });
    }
    setDeleting(false);
  };

  const filtered = useMemo(() => {
    let list = filterStatus === "all" ? authors : authors.filter((a) => a.directory_status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.pen_name?.toLowerCase().includes(q) ?? false) ||
          (a.bio_short?.toLowerCase().includes(q) ?? false) ||
          (a.genres?.some((g) => g.toLowerCase().includes(q)) ?? false)
      );
    }
    return list;
  }, [authors, filterStatus, search]);

  const startCropEdit = (author: DirectoryAuthor) => {
    setCropEditing(author.user_id);
    setCropValue(parseInt(author.photo_crop_y || "0", 10));
  };

  const saveCrop = async (userId: string) => {
    try {
      await adminDataFetch("update-author", { userId, updates: { photo_crop_y: `${cropValue}%` } });
      setAuthors((prev) =>
        prev.map((a) => (a.user_id === userId ? { ...a, photo_crop_y: `${cropValue}%` } : a))
      );
      toast({ title: "Photo position saved" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setCropEditing(null);
  };

  const counts = authors.reduce((acc, a) => {
    acc[a.directory_status] = (acc[a.directory_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAuthor} onOpenChange={() => { if (!deleting) setDeletingAuthor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Author</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingAuthor?.pen_name || "this author"}</strong> ({deletingAuthor?.author_slug || "no slug"}) and all their books, products, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAuthor} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo upload dialog */}
      <Dialog open={!!uploadingPhotoFor && !uploading} onOpenChange={() => setUploadingPhotoFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Upload Author Photo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Select a new profile photo for this author.</p>
          <Button onClick={() => fileInputRef.current?.click()} className="w-full">
            <Upload className="h-4 w-4 mr-2" /> Choose Photo
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingAuthor} onOpenChange={() => setEditingAuthor(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Author Profile</DialogTitle></DialogHeader>
          {editingAuthor && (
            <div className="space-y-4">
              <div>
                <Label>Pen Name</Label>
                <Input value={editForm.pen_name} onChange={(e) => setEditForm(f => ({ ...f, pen_name: e.target.value }))} />
              </div>
              <div>
                <Label>Tagline</Label>
                <Input value={editForm.tagline} onChange={(e) => setEditForm(f => ({ ...f, tagline: e.target.value }))} />
              </div>
              <div>
                <Label>Short Bio</Label>
                <Textarea value={editForm.bio_short} onChange={(e) => setEditForm(f => ({ ...f, bio_short: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Full Bio</Label>
                <Textarea value={editForm.bio_long} onChange={(e) => setEditForm(f => ({ ...f, bio_long: e.target.value }))} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={editForm.location_city} onChange={(e) => setEditForm(f => ({ ...f, location_city: e.target.value }))} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={editForm.location_country} onChange={(e) => setEditForm(f => ({ ...f, location_country: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Website URL</Label>
                <Input value={editForm.website_url} onChange={(e) => setEditForm(f => ({ ...f, website_url: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Instagram</Label>
                  <Input value={editForm.instagram_url} onChange={(e) => setEditForm(f => ({ ...f, instagram_url: e.target.value }))} />
                </div>
                <div>
                  <Label>Twitter/X</Label>
                  <Input value={editForm.twitter_url} onChange={(e) => setEditForm(f => ({ ...f, twitter_url: e.target.value }))} />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input value={editForm.linkedin_url} onChange={(e) => setEditForm(f => ({ ...f, linkedin_url: e.target.value }))} />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input value={editForm.youtube_url} onChange={(e) => setEditForm(f => ({ ...f, youtube_url: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingAuthor(null)}>Cancel</Button>
                <Button onClick={saveEditForm} disabled={editSaving}>
                  {editSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Author Directory Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage author visibility and status in the public directory</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAuthors} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, bio, or genre..."
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[{ key: "all", label: "All", count: authors.length }, ...ALL_STATUSES.map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: counts[s] || 0 }))].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === f.key
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {search ? `No authors match "${search}"` : "No authors found."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((author) => (
            <Card key={author.user_id} className="border">
              <CardContent className="p-4 flex items-center gap-4 relative">
                {author.photo_url ? (
                  <img
                    src={author.photo_url}
                    alt={author.pen_name || ""}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                    style={{ objectPosition: `50% ${author.photo_crop_y || '0%'}` }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {cropEditing === author.user_id && author.photo_url && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-card border rounded-lg p-4 shadow-lg">
                    <p className="text-xs font-medium mb-2">Adjust photo vertical position</p>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-24 rounded overflow-hidden border shrink-0">
                        <img src={author.photo_url} alt="Preview" className="w-full h-full object-cover" style={{ objectPosition: `50% ${cropValue}%` }} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Slider value={[cropValue]} onValueChange={([v]) => setCropValue(v)} min={0} max={50} step={1} />
                        <p className="text-xs text-muted-foreground">Position: {cropValue}% from top</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setCropEditing(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => saveCrop(author.user_id)}>Save</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{author.pen_name || "Unnamed Author"}</h3>
                    {author.author_slug && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">/{author.author_slug}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[author.directory_status] || statusColors.unlisted}`}>
                      {author.directory_status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{author.bio_short || "No bio"}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {author.book_count} books
                    </span>
                    {author.genres && author.genres.length > 0 && (
                      <span>{author.genres.slice(0, 2).join(", ")}</span>
                    )}
                    {author.author_slug && (
                      <a href={`/authors/${author.author_slug}`} target="_blank" className="flex items-center gap-1 text-secondary hover:underline">
                        <Globe className="h-3 w-3" /> View
                      </a>
                    )}
                    <button onClick={() => openEditDialog(author)} className="flex items-center gap-1 text-secondary hover:underline">
                      <Pencil className="h-3 w-3" /> Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        if (author.photo_url) startCropEdit(author);
                        else setUploadingPhotoFor(author.user_id);
                      }}
                      className="flex items-center gap-1 text-secondary hover:underline"
                    >
                      <ImageIcon className="h-3 w-3" /> {author.photo_url ? "Adjust Photo" : "Upload Photo"}
                    </button>
                    {author.photo_url && (
                      <button onClick={() => setUploadingPhotoFor(author.user_id)} className="flex items-center gap-1 text-secondary hover:underline">
                        <Upload className="h-3 w-3" /> Replace Photo
                      </button>
                    )}
                    <button onClick={() => setDeletingAuthor(author)} className="flex items-center gap-1 text-destructive hover:underline">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>

                <div className="shrink-0 w-36">
                  <Select
                    value={author.directory_status}
                    onValueChange={(val) => updateStatus(author.user_id, val)}
                    disabled={updatingId === author.user_id}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      {updatingId === author.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
