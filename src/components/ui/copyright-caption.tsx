export function CopyrightCaption({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[10px] text-muted-foreground text-right mt-1 ${className}`}>
      © Authors Bureau. All rights reserved.
    </p>
  );
}
