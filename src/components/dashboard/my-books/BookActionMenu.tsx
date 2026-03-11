import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Upload, FileText, RotateCcw, Globe, Trash2 } from "lucide-react";

interface BookActionMenuProps {
  isAnalyzed: boolean;
  hasManuscript: boolean;
  hasBookPage: boolean;
  onEdit: () => void;
  onUploadManuscript: () => void;
  onViewBusinessPlan: () => void;
  onReAnalyze: () => void;
  onViewBookPage: () => void;
  onDelete: () => void;
}

export default function BookActionMenu({
  isAnalyzed, hasManuscript, hasBookPage,
  onEdit, onUploadManuscript, onViewBusinessPlan, onReAnalyze, onViewBookPage, onDelete,
}: BookActionMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Book
          </DropdownMenuItem>
          {!hasManuscript && (
            <DropdownMenuItem onClick={onUploadManuscript}>
              <Upload className="h-3.5 w-3.5 mr-2" /> Upload Manuscript
            </DropdownMenuItem>
          )}
          {isAnalyzed && (
            <>
              <DropdownMenuItem onClick={onViewBusinessPlan}>
                <FileText className="h-3.5 w-3.5 mr-2" /> View Business Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReAnalyze}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Re-Analyze with Abby
              </DropdownMenuItem>
            </>
          )}
          {hasMicrosite && (
            <DropdownMenuItem onClick={onViewMicrosite}>
              <Globe className="h-3.5 w-3.5 mr-2" /> View Microsite
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Book
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. Your book and all associated data will not be retrievable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
