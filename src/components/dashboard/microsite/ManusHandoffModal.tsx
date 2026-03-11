import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2, FileText, Globe } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManusHandoffModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-accent" />
            </div>
            <DialogTitle className="font-heading text-lg">
              Your Business Design File is Ready!
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-2">
            You now have everything you need to build your professional author website.
            Click the button below to transfer your design file to Manus and get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="flex items-start gap-3 text-sm">
            <FileText className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Your design file contains your profile, books, products, services, and audience data — everything Manus needs.
            </span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <Globe className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Manus will build a fully responsive, SEO-optimized website with your own custom domain.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            asChild
          >
            <a
              href="https://manus.im/invitation/XT9XTFJVZ8SASD"
              target="_blank"
              rel="noopener noreferrer"
            >
              Build Your Website with Manus
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
